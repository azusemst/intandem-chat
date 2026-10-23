import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { database } from "./database.mjs";
import { ids, profileInput } from "./fixtures";
import { recommend } from "../src/lib/server/matching";
import type { ProfileInput } from "../src/lib/validation/profile";
import type { Candidate } from "../src/lib/models";
type RequestRow = {id:string;sender:string;recipient:string;status:string};
let db: PGlite;
function asUser<T>(id: string | null, work: (tx: Transaction) => Promise<T>, role = "authenticated"): Promise<T> {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id ?? ""]);
    return work(tx);
  });
}
const save = (id: string, change: Partial<ProfileInput> = {}) => asUser(id, tx => tx.query("select public.save_profile($1::jsonb)",[JSON.stringify(profileInput(change))]));
const create = async (sender: string, recipient: string) => (await asUser(sender, tx => tx.query<RequestRow>("select * from public.create_request($1::uuid)",[recipient]))).rows[0];
const transition = async (who: string, id: string, expected: string, next: string) => (await asUser(who, tx => tx.query<RequestRow>("select * from public.transition_request($1::uuid,$2,$3)",[id,expected,next]))).rows[0];
const read = (who: string | null, table: string, role = "authenticated") => asUser(who, tx => tx.query(`select * from public.${table}`),role);
beforeAll(async () => {
  db = await database();
  for (const [name,id] of Object.entries(ids)) await db.query("insert into auth.users(id,email,email_confirmed_at,banned_until) values($1,$2,$3,$4)",[
    id, name === "wrong" ? "fictional@evilusc.edu" : `${name}.fictional@usc.edu`,name === "unconfirmed" ? null : "2026-10-22T00:00:00Z",name === "banned" ? "2099-01-01T00:00:00Z" : null,
  ]);
  await save(ids.alice,{display_name:"FICTIONAL ALICE",contact_email:"alice@example.test"});
  await save(ids.bob,{display_name:"FICTIONAL BOB",contact_email:"bob@example.test"});
  await save(ids.cara,{display_name:"FICTIONAL CARA",contact_email:"cara@example.test"});
});
afterAll(async () => { await db?.close(); });
describe("direct PostgreSQL access using ordinary roles", () => {
  it("rejects anonymous reads and function calls", async () => {
    await expect(read(null,"profiles","anon")).rejects.toThrow(/permission denied/);
    await expect(asUser(null,tx => tx.query("select public.create_request($1)",[ids.bob]),"anon")).rejects.toThrow(/permission denied/);
    await expect(asUser(null,tx => tx.query("select public.request_deletion()"))).rejects.toThrow(/Eligible/);
  });
  it.each(["wrong","unconfirmed","banned"] as const)("rejects %s accounts even with a valid UUID", async name => {
    expect((await read(ids[name],"profiles")).rows).toEqual([]);
    expect((await read(ids[name],"private_contacts")).rows).toEqual([]);
    expect((await read(ids[name],"match_requests")).rows).toEqual([]);
    await expect(save(ids[name])).rejects.toThrow(/Eligible/);
    await expect(create(ids[name],ids.alice)).rejects.toThrow(/eligible/);
  });
  it("permits shared profiles but exposes no login or contact email in candidate records", async () => {
    const rows = (await asUser(ids.alice,tx => tx.query("select * from public.candidate_profiles()"))).rows;
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toMatch(/@|email/);
  });
  it("denies direct writes to owned and foreign profiles/contacts and all request identities", async () => {
    for (const id of [ids.alice,ids.bob]) {
      await expect(asUser(ids.alice,tx => tx.query("update public.profiles set display_name='forged' where user_id=$1",[id]))).rejects.toThrow(/permission denied/);
      await expect(asUser(ids.alice,tx => tx.query("update public.private_contacts set email='forged@example.test' where user_id=$1",[id]))).rejects.toThrow(/permission denied/);
    }
    await expect(asUser(ids.alice,tx => tx.query("insert into public.match_requests(sender,recipient) values($1,$2)",[ids.bob,ids.cara]))).rejects.toThrow(/permission denied/);
    await expect(asUser(ids.alice,tx => tx.query("update auth.users set email_confirmed_at=now() where id=$1",[ids.unconfirmed]))).rejects.toThrow(/permission denied/);
    await expect(asUser(ids.alice,tx => tx.query("insert into private.allowed_email_domains values('evilusc.edu')"))).rejects.toThrow(/permission denied/);
  });
  it("allows owner-only contact reads before acceptance", async () => {
    const own = (await read(ids.alice,"private_contacts")).rows as {user_id:string;email:string}[];
    expect(own).toEqual([expect.objectContaining({user_id:ids.alice,email:"alice@example.test"})]);
  });
  it("ignores forged profile identity and verification fields in a direct RPC payload", async () => {
    await asUser(ids.alice,tx => tx.query("select public.save_profile($1::jsonb)",[JSON.stringify({...profileInput({display_name:"FICTIONAL ALICE",contact_email:"alice@example.test"}),user_id:ids.bob,eligible:true,email_confirmed:true})]));
    const bob = (await asUser(ids.bob,tx => tx.query("select display_name from public.profiles where user_id=$1",[ids.bob]))).rows[0];
    expect(bob).toEqual({display_name:"FICTIONAL BOB"});
  });
  it("filters changed identity eligibility and incomplete profiles in the database", async () => {
    await db.query("update auth.users set email='fictional@usc.edu.evil.test' where id=$1",[ids.bob]);
    expect((await asUser(ids.alice,tx => tx.query<{user_id:string}>("select * from public.candidate_profiles()"))).rows.map(p => p.user_id)).not.toContain(ids.bob);
    await expect(create(ids.alice,ids.bob)).rejects.toThrow(/eligible/);
    await db.query("update auth.users set email='bob.fictional@usc.edu' where id=$1",[ids.bob]);
    await db.query("update public.profiles set complete=false where user_id=$1",[ids.bob]);
    expect((await asUser(ids.alice,tx => tx.query<{user_id:string}>("select * from public.candidate_profiles()"))).rows.map(p => p.user_id)).not.toContain(ids.bob);
    await expect(create(ids.alice,ids.bob)).rejects.toThrow(/complete/);
    await db.query("update public.profiles set complete=true where user_id=$1",[ids.bob]);
  });
  it("persists a profile, topics, availability and contact atomically", async () => {
    await save(ids.cara,{display_name:"FICTIONAL 李明",goals:["learn statistics"],topics:[{label:"  Math   108 ",kind:"practice",level:"intermediate"}],availability:[{day:4,start_time:"12:00",end_time:"13:00"}],contact_email:"new@example.test"});
    const again = await asUser(ids.cara, async tx => ({
      profile:(await tx.query("select * from public.profiles where user_id=$1",[ids.cara])).rows[0],
      topics:(await tx.query("select * from public.profile_topics where user_id=$1",[ids.cara])).rows,
      availability:(await tx.query("select * from public.availability where user_id=$1",[ids.cara])).rows,
      contact:(await tx.query("select * from public.private_contacts where user_id=$1",[ids.cara])).rows[0],
    }));
    expect(again.profile).toMatchObject({display_name:"FICTIONAL 李明",goals:["learn statistics"],version:2});
    expect(again.topics).toEqual([expect.objectContaining({topic_key:"math 108",level:"intermediate"})]);
    expect(again.availability).toEqual([expect.objectContaining({day:4,start_time:"12:00:00"})]);
    expect(again.contact).toMatchObject({email:"new@example.test"});
    await expect(save(ids.cara,{display_name:"SHOULD ROLL BACK",availability:[{day:1,start_time:"22:00",end_time:"01:00"}]})).rejects.toThrow();
    const after = (await asUser(ids.cara,tx => tx.query("select * from public.profiles where user_id=$1",[ids.cara]))).rows[0];
    expect(after).toEqual(again.profile);
    expect((await asUser(ids.cara,tx => tx.query("select * from public.availability where user_id=$1",[ids.cara]))).rows).toEqual(again.availability);
  });
  it("validates complete profile structure in the database without trusting client flags", async () => {
    for (const change of [{topics:[]},{availability:[]},{timezone:"Fake/Zone"},{purpose:"career",industry:null,recruiting_stage:null},{goals:[]},{contact_email:"bad"}]) {
      await expect(asUser(ids.alice,tx => tx.query("select public.save_profile($1::jsonb)",[JSON.stringify({...profileInput(),...change})]))).rejects.toThrow();
    }
  });
});
describe("real recommendation → request → acceptance → authorized handoff", () => {
  let r: RequestRow;
  it("uses persisted data to rank and create a request without AI configuration", async () => {
    const persisted = await asUser(ids.alice,async tx => {
      const profiles = (await tx.query<Omit<Candidate,"topics"|"availability"|"eligible">>("select * from public.profiles")).rows;
      const topics = (await tx.query<Candidate["topics"][number] & {user_id:string}>("select * from public.profile_topics")).rows;
      const windows = (await tx.query<Candidate["availability"][number] & {user_id:string}>("select * from public.availability")).rows;
      return profiles.map(p => ({...p,eligible:true,topics:topics.filter(t => t.user_id === p.user_id),availability:windows.filter(w => w.user_id === p.user_id)}));
    });
    const [recommendation] = recommend({viewer:persisted.find(p => p.user_id === ids.alice)!,candidates:persisted,now:"2026-10-22T12:00:00Z"});
    expect(recommendation.candidate.user_id).toBe(ids.bob);
    r = await create(ids.alice,recommendation.candidate.user_id);
    expect(r).toMatchObject({sender:ids.alice,recipient:ids.bob,status:"pending"});
  });
  it("deduplicates repeated and reciprocal submissions transactionally", async () => {
    const repeats = await Promise.all([create(ids.alice,ids.bob),create(ids.bob,ids.alice),create(ids.alice,ids.bob)]);
    expect(repeats.map(x => x.id)).toEqual([r.id,r.id,r.id]);
    expect((await read(ids.alice,"match_requests")).rows).toHaveLength(1);
  });
  it("keeps requests participant-only and rejects premature contact reads", async () => {
    expect((await read(ids.cara,"match_requests")).rows).toEqual([]);
    expect((await read(ids.bob,"match_requests")).rows).toHaveLength(1);
    expect((await read(ids.alice,"private_contacts")).rows).toHaveLength(1);
    await expect(transition(ids.cara,r.id,"pending","accepted")).rejects.toThrow(/unavailable/);
    await expect(transition(ids.alice,r.id,"pending","accepted")).rejects.toThrow(/not allowed/);
    await expect(transition(ids.bob,r.id,"pending","canceled")).rejects.toThrow(/not allowed/);
    await expect(asUser(ids.bob,tx => tx.query("select public.transition_request($1,null,'accepted')",[r.id]))).rejects.toThrow(/changed/);
  });
  it("allows only the recipient to accept and reveal both contacts", async () => {
    expect((await transition(ids.bob,r.id,"pending","accepted")).status).toBe("accepted");
    expect((await read(ids.alice,"private_contacts")).rows).toHaveLength(2);
    expect((await read(ids.bob,"private_contacts")).rows).toHaveLength(2);
    expect((await read(ids.cara,"private_contacts")).rows).toHaveLength(1);
    await expect(transition(ids.bob,r.id,"pending","accepted")).rejects.toThrow(/changed/);
  });
  it("immediately revokes database contact access when either participant ends a partnership", async () => {
    expect((await transition(ids.bob,r.id,"accepted","canceled")).status).toBe("canceled");
    expect((await read(ids.alice,"private_contacts")).rows).toHaveLength(1);
    expect((await read(ids.bob,"private_contacts")).rows).toHaveLength(1);
    await expect(transition(ids.bob,r.id,"canceled","accepted")).rejects.toThrow(/not allowed/);
  });
  it("creates a new request after terminal states and allows decline and sender cancellation", async () => {
    const replacement = await create(ids.alice,ids.bob); expect(replacement.id).not.toBe(r.id);
    await transition(ids.bob,replacement.id,"pending","declined");
    await expect(transition(ids.bob,replacement.id,"declined","accepted")).rejects.toThrow(/not allowed/);
    const again = await create(ids.bob,ids.alice);
    await transition(ids.bob,again.id,"pending","canceled");
  });
  it("rechecks eligibility on acceptance even if the pending request was eligible", async () => {
    const pending = await create(ids.alice,ids.bob);
    await db.query("update auth.users set email_confirmed_at=null where id=$1",[ids.alice]);
    await expect(transition(ids.bob,pending.id,"pending","accepted")).rejects.toThrow(/no longer eligible/);
    await db.query("update auth.users set email_confirmed_at=now() where id=$1",[ids.alice]);
    await transition(ids.alice,pending.id,"pending","canceled");
  });
});
describe("privacy and candidate freshness", () => {
  it("dismisses and resets recommendations without changing incoming request state", async () => {
    await asUser(ids.alice,tx => tx.query("select public.dismiss_candidate($1)",[ids.bob]));
    expect((await read(ids.alice,"recommendation_dismissals")).rows).toHaveLength(1);
    expect((await read(ids.bob,"recommendation_dismissals")).rows).toHaveLength(0);
    await asUser(ids.alice,tx => tx.query("select public.reset_dismissals()"));
    expect((await read(ids.alice,"recommendation_dismissals")).rows).toHaveLength(0);
  });
  it("pauses immediately, rejects stale requests, and resumes without losing existing requests", async () => {
    const r = await create(ids.alice,ids.bob);
    await asUser(ids.bob,tx => tx.query("select public.set_matching(false)"));
    const pool = (await asUser(ids.alice,tx => tx.query<{user_id:string}>("select * from public.candidate_profiles()"))).rows;
    expect(pool.map(p => p.user_id)).not.toContain(ids.bob);
    await expect(create(ids.cara,ids.bob)).rejects.toThrow(/active/);
    await transition(ids.bob,r.id,"pending","accepted");
    expect((await read(ids.bob,"private_contacts")).rows).toHaveLength(2);
    await asUser(ids.bob,tx => tx.query("select public.set_matching(true)"));
    await transition(ids.alice,r.id,"accepted","canceled");
  });
  it("records removal honestly, pauses, prevents resume, and preserves a pending status", async () => {
    await asUser(ids.cara,tx => tx.query("select public.request_deletion()"));
    await asUser(ids.cara,tx => tx.query("select public.request_deletion()"));
    expect((await read(ids.cara,"deletion_requests")).rows).toEqual([expect.objectContaining({user_id:ids.cara,status:"pending"})]);
    expect((await read(ids.alice,"deletion_requests")).rows).toEqual([]);
    await expect(asUser(ids.cara,tx => tx.query("select public.set_matching(true)"))).rejects.toThrow(/Removal is pending/);
    await save(ids.cara); // Editing does not implicitly resume a paused profile.
    expect((await asUser(ids.cara,tx => tx.query("select active from public.profiles where user_id=$1",[ids.cara]))).rows[0]).toEqual({active:false});
    await expect(create(ids.alice,ids.cara)).rejects.toThrow(/active/);
  });
});
