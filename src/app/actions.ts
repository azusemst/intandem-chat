"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, configured } from "@/lib/supabase/server";
import { requireSession } from "@/lib/server/auth";
import { profileSchema } from "@/lib/validation/profile";
import { allowedEmail } from "@/lib/identity";
import type { ActionState } from "@/lib/actions.types";
import type { Json } from "@/lib/database.types";

const refresh = () => { for (const path of ["/profile", "/matches", "/requests", "/settings", "/onboarding"]) revalidatePath(path); };
function serviceError(error: { message: string; code?: string }): ActionState {
  const known = ["Request changed. Refresh to see its current state", "Both profiles must be complete and matching must be active", "Candidate is no longer eligible", "Participant is no longer eligible", "Removal is pending; contact the team before resuming"];
  return { error: known.includes(error.message) ? error.message : "The change could not be saved. Check your connection and retry. Your input is preserved." };
}
export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = form.get("resend") ? "" : String(form.get("token") ?? "").trim();
  if (!z.email().safeParse(email).success || !allowedEmail(email, process.env.USC_EMAIL_DOMAINS)) return { error: "Use an email address with the exact usc.edu domain.", email };
  if (!configured()) return { error: "Sign-in is not available yet. The team needs to configure the service.", email };
  try {
    const db = await createClient();
    if (!token) {
      const { error } = await db.auth.signInWithOtp({ email });
      if (error) return { error: "We could not send a code. Wait a minute and retry, or contact the team.", email };
      return { codeSent: true, email, success: "Code sent. Check your USC inbox and enter the code below." };
    }
    if (!/^\d{6,10}$/.test(token)) return { error: "Enter the numeric code from your email.", codeSent: true, email };
    const { error } = await db.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { error: "That code is invalid or expired. Retry or request a new code.", codeSent: true, email };
  } catch { return { error: "Sign-in could not connect. Please retry.", email, codeSent: !!token }; }
  redirect("/matches");
}
export async function logoutAction(): Promise<void> {
  if (configured()) {
    const db = await createClient();
    const { error } = await db.auth.signOut();
    if (error) throw new Error("Sign-out failed. Please retry.");
  }
  redirect("/login");
}
export async function saveProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireSession();
  let payload: unknown;
  try { payload = JSON.parse(String(form.get("profile"))); } catch { return { error: "The form could not be read. Please retry." }; }
  const result = profileSchema.safeParse(payload);
  if (!result.success) return { error: result.error.issues.map(i => `${i.path.join(" · ")}: ${i.message}`).join(" ") };
  try {
    const { error } = await db.rpc("save_profile", { payload: result.data as unknown as Json });
    if (error) return serviceError(error);
  } catch { return { error: "Could not connect. Your input is preserved; please retry." }; }
  refresh();
  redirect("/profile?saved=1");
}
export async function requestAction(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireSession();
  const candidate = z.uuid().safeParse(form.get("candidate"));
  if (!candidate.success) return { error: "Invalid candidate. Refresh and retry." };
  try {
    const { error } = await db.rpc("create_request", { candidate: candidate.data });
    if (error) return serviceError(error);
  } catch { return { error: "Request could not connect. Retry safely; duplicate requests are prevented." }; }
  refresh();
  redirect("/requests?notice=saved");
}
export async function transitionAction(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireSession();
  const id = z.uuid().safeParse(form.get("request_id"));
  if (!id.success) return { error: "Invalid request." };
  try {
    const { error } = await db.rpc("transition_request", { request_id: id.data, expected_status: String(form.get("expected_status")), next_status: String(form.get("next_status")) });
    if (error) return serviceError(error);
    refresh(); return { success: "Request updated." };
  } catch { return { error: "Could not connect. Refresh the request before retrying." }; }
}
export async function settingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireSession();
  try {
    const operation = form.get("operation");
    const result = operation === "pause" || operation === "resume" ? await db.rpc("set_matching", { enabled: operation === "resume" })
      : operation === "remove" && form.get("confirm") === "on" ? await db.rpc("request_deletion")
        : operation === "reset" ? await db.rpc("reset_dismissals") : null;
    if (!result) return { error: "Confirm the removal request before submitting." };
    if (result.error) return serviceError(result.error);
    refresh(); return { success: operation === "remove" ? "Removal request recorded. Matching is paused; team processing is pending." : "Settings saved." };
  } catch { return { error: "Could not save settings. Please retry." }; }
}
export async function dismissAction(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireSession();
  const candidate = z.uuid().safeParse(form.get("candidate"));
  if (!candidate.success) return { error: "Invalid candidate." };
  try {
    const { error } = await db.rpc("dismiss_candidate", { candidate: candidate.data });
    if (error) return serviceError(error);
    refresh(); return { success: "Dismissed. Another eligible peer will appear if available." };
  } catch { return { error: "Could not dismiss this recommendation. Please retry." }; }
}
