import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  configured: true,
  user: null as null | { id:string; email:string; email_confirmed_at:string|null },
  error: null as null | {message:string},
  rpc: vi.fn(), getUser: vi.fn(),
}));
vi.mock("server-only",() => ({}));
vi.mock("next/navigation",() => ({redirect:(url: string) => { throw new Error(`REDIRECT ${url}`); }}));
vi.mock("next/cache",() => ({revalidatePath:vi.fn()}));
vi.mock("@/lib/supabase/server",() => ({
  configured:() => fixture.configured,
  createClient:async () => ({auth:{getUser:fixture.getUser},rpc:fixture.rpc}),
}));
import { requireSession } from "../src/lib/server/auth";
import { dismissAction, requestAction, saveProfileAction, settingsAction, transitionAction } from "../src/app/actions";
beforeEach(() => {
  fixture.configured = true; fixture.user = null; fixture.error = null;
  fixture.rpc.mockReset(); fixture.getUser.mockReset();
  fixture.getUser.mockImplementation(async () => ({data:{user:fixture.user},error:fixture.error}));
  vi.stubEnv("USC_EMAIL_DOMAINS","usc.edu");
});
afterEach(() => vi.unstubAllEnvs());
describe("verified server identity on every protected operation", () => {
  it("checks the Auth server rather than trusting a stored session", async () => {
    fixture.user = {id:"owner",email:"student@usc.edu",email_confirmed_at:"2026-10-22T12:00:00Z"};
    expect((await requireSession()).user.id).toBe("owner");
    expect(fixture.getUser).toHaveBeenCalledOnce();
  });
  it("redirects expired and unavailable sessions", async () => {
    await expect(requireSession()).rejects.toThrow("REDIRECT /login?notice=session");
    fixture.error = {message:"expired"};
    await expect(requireSession()).rejects.toThrow("REDIRECT /login?notice=session");
    fixture.configured = false;
    await expect(requireSession()).rejects.toThrow("REDIRECT /login");
  });
  it.each([
    {id:"unconfirmed",email:"student@usc.edu",email_confirmed_at:null},
    {id:"wrong",email:"student@usc.edu.evil.test",email_confirmed_at:"2026-10-22T12:00:00Z"},
  ])("rejects an ineligible $id identity",async user => {
    fixture.user = user;
    await expect(requireSession()).rejects.toThrow("REDIRECT /login?notice=eligibility");
  });
  it("rejects direct unauthenticated Server Action calls before validation or database access", async () => {
    for (const action of [saveProfileAction,requestAction,transitionAction,settingsAction,dismissAction]) {
      await expect(action({},new FormData())).rejects.toThrow("REDIRECT /login?notice=session");
    }
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
});
