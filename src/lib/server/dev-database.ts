import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { DEV_SESSION_COOKIE, devEmailLogin } from "@/lib/dev-mode";
import { allowedEmail } from "@/lib/identity";

const state = globalThis as typeof globalThis & { intandemDevDB?: Promise<PGlite> };
function database() {
  if (!devEmailLogin()) throw new Error("Local email login is disabled");
  return state.intandemDevDB ??= (async () => {
    await mkdir(".next/intandem-dev-db", { recursive: true });
    const db = new PGlite(".next/intandem-dev-db");
    const exists = await db.query("select 1 from pg_namespace where nspname='auth'");
    if (!exists.rows.length) {
      await db.transaction(async tx => {
        await tx.exec(`create role anon nologin; create role authenticated nologin;
          create schema auth;
          create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);
          create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          grant usage on schema auth to authenticated;
          grant execute on function auth.uid() to authenticated;`);
        await tx.exec(await readFile("supabase/migrations/202610220001_matching.sql", "utf8"));
        await tx.exec("create table private.dev_sessions(token_hash text primary key,user_id uuid references auth.users(id),expires_at timestamptz not null)");
      });
    }
    return db;
  })();
}
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function devSignIn(email: string) {
  if (!allowedEmail(email)) throw new Error("Use an exact usc.edu address");
  const db = await database();
  const result = await db.query<{ id: string }>(`insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())
    on conflict(email) do update set email=excluded.email returning id`, [randomUUID(),email]);
  const token = randomBytes(32).toString("hex");
  await db.query("insert into private.dev_sessions values($1,$2,now()+interval '1 day')", [hash(token),result.rows[0].id]);
  (await cookies()).set(DEV_SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",path:"/",maxAge:86400});
}
export async function devSignOut() {
  const jar = await cookies();
  const token = jar.get(DEV_SESSION_COOKIE)?.value;
  if (token) await (await database()).query("delete from private.dev_sessions where token_hash=$1",[hash(token)]);
  jar.delete(DEV_SESSION_COOKIE);
}
// Minimal PostgREST-compatible adapter for existing app reads and RPCs. The
// application migrations and ordinary-role RLS still govern every operation.
export async function devClient(): Promise<SupabaseClient<Database>> {
  const db = await database();
  const token = (await cookies()).get(DEV_SESSION_COOKIE)?.value ?? "";
  const user = (await db.query<{id:string;email:string;email_confirmed_at:string}>(`select u.id,u.email,u.email_confirmed_at from auth.users u
    join private.dev_sessions s on s.user_id=u.id where s.token_hash=$1 and s.expires_at>now()`,[hash(token)])).rows[0] ?? null;
  const identifier = (s: string) => {
    if (!/^[a-z_]+$/.test(s)) throw new Error("Invalid identifier");
    return `"${s}"`;
  };
  const tables = ["profiles","profile_topics","availability","private_contacts","match_requests","deletion_requests","recommendation_dismissals"];
  const procedures: Record<string,string[]> = {save_profile:["payload"],create_request:["candidate"],transition_request:["request_id","expected_status","next_status"],set_matching:["enabled"],request_deletion:[],dismiss_candidate:["candidate"],reset_dismissals:[],candidate_profiles:[]};
  function query(table?: string, rpc?: string, args: Record<string,unknown> = {}) {
    let columns = "*", single = false, limit = "";
    const where: string[] = [], order: string[] = [], params: unknown[] = [];
    const parameter = (v: unknown) => { params.push(v); return `$${params.length}`; };
    const builder = {
      select(value = "*") { columns = value === "*" ? "*" : value.split(",").map(identifier).join(","); return builder; },
      eq(key: string,value: unknown) { where.push(`${identifier(key)}=${parameter(value)}`); return builder; },
      in(key: string,values: unknown[]) { where.push(`${identifier(key)} in (${values.map(parameter).join(",")})`); return builder; },
      order(key: string,options?: {ascending?:boolean}) { order.push(`${identifier(key)} ${options?.ascending === false ? "desc" : "asc"}`); return builder; },
      range(start: number,end: number) { limit = ` limit ${Math.max(0,Math.floor(end-start+1))} offset ${Math.max(0,Math.floor(start))}`; return builder; },
      maybeSingle() { single = true; return builder; },
      async then(resolve: (value: unknown) => unknown) {
        try {
          if (table && !tables.includes(table)) throw new Error("Unknown table");
          let source = table ? `public.${identifier(table)}` : "";
          if (rpc) {
            if (!(rpc in procedures)) throw new Error("Unknown procedure");
            source = `public.${identifier(rpc)}(${procedures[rpc].map(key => parameter(key === "payload" ? JSON.stringify(args[key]) : args[key])).join(",")})`;
          }
          const result = await db.transaction(async tx => {
            await tx.exec("set local role authenticated");
            await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user?.id ?? ""]);
            return tx.query(`select ${columns} from ${source}${where.length ? " where "+where.join(" and ") : ""}${order.length ? " order by "+order.join(",") : ""}${limit}`,params);
          });
          return resolve({data:single || (rpc && rpc !== "candidate_profiles") ? result.rows[0] ?? null : result.rows,error:null});
        } catch (error) { return resolve({data:null,error:{message:error instanceof Error ? error.message : "Local database error"}}); }
      },
    };
    return builder;
  }
  return {auth:{getUser:async () => ({data:{user},error:user ? null : {message:"Session expired"}})},
    from:(table: string) => query(table),rpc:(name: string,args?:Record<string,unknown>) => query(undefined,name,args),
  } as unknown as SupabaseClient<Database>;
}
