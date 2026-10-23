"use client";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions";
export function LoginForm({ available, development = false }: { available: boolean; development?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, {});
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const sameEmail = state.email === email.trim().toLowerCase();
  const verifying = state.codeSent && sameEmail;
  return <form action={action} className="stack">
    <label>USC email<input name="email" type="email" autoComplete="email" placeholder="you@usc.edu" required value={email} onChange={e => { setEmail(e.target.value); setToken(""); }} /></label>
    {verifying && <label>Verification code<input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required value={token} onChange={e => setToken(e.target.value)} /></label>}
    <button disabled={pending || !available} className="button">{pending ? "Connecting…" : verifying ? "Verify and continue" : development ? "Continue with USC email" : "Email me a code"}</button>
    {verifying && <button className="button secondary" formNoValidate name="resend" value="1" onClick={() => setToken("")}>Send a new code</button>}
    <div aria-live="polite">{state.error && <p className="message error" role="alert">{state.error}</p>}{state.success && sameEmail && <p className="message success">{state.success}</p>}</div>
  </form>;
}
