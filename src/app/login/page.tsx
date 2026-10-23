import { LoginForm } from "@/components/login-form";
import { configured } from "@/lib/supabase/server";
import { logoutAction } from "@/app/actions";
export default async function Login({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const available = configured();
  return <main id="main" className="narrow page"><span className="eyebrow">Your next chapter starts with a hello</span><h1>Welcome to InTandem.</h1><p>Verify your USC email to find a practice partner. We’ll send a code—no password needed.</p><div className="panel stack">
    {!available && <p className="message">Sign-in is awaiting service setup. The team has not connected email and database services yet.</p>}
    {notice === "session" && <p className="message">Your session expired or could not be verified. Please sign in again.</p>}
    {notice === "eligibility" && <div className="message"><p>A confirmed email with the exact usc.edu domain is required.</p><form action={logoutAction}><button className="text-button">Sign out of this account</button></form></div>}
    <LoginForm available={available} />
  </div><p className="hint">Email verification confirms access to a USC inbox, not current enrollment. Your login email stays private unless you explicitly choose to share it as your contact.</p></main>;
}
