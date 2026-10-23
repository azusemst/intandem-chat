import "server-only";
import { redirect } from "next/navigation";
import { createClient, configured } from "@/lib/supabase/server";
import { allowedEmail } from "@/lib/identity";

export async function requireSession() {
  if (!configured()) redirect("/login");
  const db = await createClient();
  // Auth server verification catches revoked, expired and unconfirmed sessions.
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/login?notice=session");
  if (!user.email_confirmed_at || !allowedEmail(user.email ?? "", process.env.USC_EMAIL_DOMAINS)) redirect("/login?notice=eligibility");
  return { db, user };
}
