import { ProfileForm } from "@/components/profile-form";
import { ownProfile } from "@/lib/server/data";
export default async function Onboarding() {
  const { db, user, profile } = await ownProfile();
  const { data: contact, error } = await db.from("private_contacts").select("email").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load your contact choice.");
  return <><div className="page-heading"><span className="eyebrow">A good introduction goes a long way</span><h1>{profile ? "Make it yours." : "Let’s find your people."}</h1><p>Share a few details to help peers find a reason to connect.</p></div><ProfileForm profile={profile} contactEmail={contact?.email} loginEmail={user.email!} /></>;
}
