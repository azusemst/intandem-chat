import "server-only";
import { redirect } from "next/navigation";
import { requireSession } from "./auth";
import type { Candidate, Partnership } from "@/lib/models";
import type { Database } from "@/lib/database.types";
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type DB = Awaited<ReturnType<typeof requireSession>>["db"];
const check = (error: unknown) => { if (error) throw new Error("The service could not load your data. Please retry."); };
export async function hydrate(db: DB, rows: ProfileRow[], eligible = true): Promise<Candidate[]> {
  if (!rows.length) return [];
  const ids = rows.map(p => p.user_id);
  // Page associated rows as well: PostgREST's default row limit must not silently
  // remove a student's topics or scheduling windows from recommendations.
  const topics: Database["public"]["Tables"]["profile_topics"]["Row"][] = [];
  const windows: Database["public"]["Tables"]["availability"]["Row"][] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from("profile_topics").select("*").in("user_id", ids).order("id").range(start, start + 499);
    check(error); topics.push(...data!); if (data!.length < 500) break;
  }
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from("availability").select("*").in("user_id", ids).order("id").range(start, start + 499);
    check(error); windows.push(...data!); if (data!.length < 500) break;
  }
  return rows.map(p => ({ ...p, eligible, purpose: p.purpose as Candidate["purpose"],
    topics: topics.filter(t => t.user_id === p.user_id).map(t => ({ ...t, kind: t.kind as "practice" | "help", level: t.level as Candidate["topics"][number]["level"] })),
    availability: windows.filter(w => w.user_id === p.user_id),
  }));
}
export async function ownProfile(required = false) {
  const { db, user } = await requireSession();
  const { data, error } = await db.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  check(error);
  if (required && !data) redirect("/onboarding");
  const profile = data ? (await hydrate(db, [data]))[0] : null;
  return { db, user, profile };
}
export async function readRequests(db: DB): Promise<Partnership[]> {
  const rows: Partnership[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from("match_requests").select("*").order("created_at", { ascending: false }).order("id").range(start, start + 499);
    check(error); rows.push(...data! as Partnership[]); if (data!.length < 500) break;
  }
  return rows;
}
export async function candidates(db: DB): Promise<Candidate[]> {
  const result: Candidate[] = [];
  for (let start = 0; ; start += 100) {
    const { data, error } = await db.rpc("candidate_profiles").range(start, start + 99);
    check(error); result.push(...await hydrate(db, data!)); if (data!.length < 100) break;
  }
  return result;
}
