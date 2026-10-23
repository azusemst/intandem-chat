import { afterEach, expect, it, vi } from "vitest";
import { profileInput } from "./fixtures";
const jar = vi.hoisted(() => new Map<string,string>());
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({cookies: async () => ({
  get:(name: string) => jar.has(name) ? {value:jar.get(name)} : undefined,
  set:(name:string,value:string) => jar.set(name,value), delete:(name:string) => jar.delete(name),
})}));
vi.mock("@electric-sql/pglite", async () => {
  const actual = await vi.importActual<typeof import("@electric-sql/pglite")>("@electric-sql/pglite");
  return {PGlite: class extends actual.PGlite { constructor() { super(); } }};
});
import { devEmailLogin } from "../src/lib/dev-mode";
import { devSignIn, devSignOut, devClient } from "../src/lib/server/dev-database";
afterEach(() => vi.unstubAllEnvs());
it("restricts the bypass to development without hosted services and supports disabling it", () => {
  vi.stubEnv("NODE_ENV","development"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","");
  expect(devEmailLogin()).toBe(true);
  vi.stubEnv("NODE_ENV","production"); expect(devEmailLogin()).toBe(false);
  vi.stubEnv("NODE_ENV","development"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://example.supabase.co"); expect(devEmailLogin()).toBe(false);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL",""); vi.stubEnv("DEV_EMAIL_LOGIN","false"); expect(devEmailLogin()).toBe(false);
});
it("logs in two local accounts, persists profiles, accepts a request and revokes the session on sign-out", async () => {
  vi.stubEnv("NODE_ENV","development"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL",""); vi.stubEnv("DEV_EMAIL_LOGIN","true");
  await expect(devSignIn("fake@usc.edu.evil.test")).rejects.toThrow();
  await devSignIn("alice@usc.edu");
  const alice = await devClient();
  const aliceID = (await alice.auth.getUser()).data.user!.id;
  expect((await alice.rpc("save_profile",{payload:profileInput() })).error).toBeNull();
  const aliceCookie = new Map(jar);
  await devSignIn("bob@usc.edu");
  const bob = await devClient();
  const bobID = (await bob.auth.getUser()).data.user!.id;
  expect((await bob.rpc("save_profile",{payload:profileInput() })).error).toBeNull();
  expect((await bob.from("private_contacts").select("email")).data).toHaveLength(1);
  const request = await alice.rpc("create_request",{candidate:bobID});
  expect(request.error).toBeNull();
  expect((await bob.rpc("transition_request",{request_id:request.data!.id,expected_status:"pending",next_status:"accepted"})).error).toBeNull();
  expect((await bob.from("private_contacts").select("user_id,email").in("user_id",[aliceID])).data).toHaveLength(1);
  await devSignOut();
  expect((await (await devClient()).auth.getUser()).data.user).toBeNull();
  jar.clear(); aliceCookie.forEach((value,key) => jar.set(key,value));
  const again = await devClient();
  expect((await again.from("profiles").select("*").eq("user_id",aliceID).maybeSingle()).data?.display_name).toBe("FICTIONAL TEST STUDENT");
});
