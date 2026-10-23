"use client";
import { useActionState } from "react";
import type { ReactNode } from "react";
import type { FormAction } from "@/lib/actions.types";

export function ActionForm({ action, fields = {}, label, children, secondary = false }: {
  action: FormAction; fields?: Record<string, string>; label: string; children?: ReactNode; secondary?: boolean;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="action-form">
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    {children}
    <button disabled={pending} className={secondary ? "button secondary" : "button"}>{pending ? "Saving…" : label}</button>
    <div aria-live="polite">{state.error && <p role="alert" className="message error">{state.error}</p>}{state.success && <p className="message success">{state.success}</p>}</div>
  </form>;
}
