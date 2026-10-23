import Link from "next/link";
import { ProfileDetails } from "@/components/profile-details";
import { ownProfile } from "@/lib/server/data";
export default async function Profile({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { db, user, profile } = await ownProfile(true);
  const { data: contact, error } = await db.from("private_contacts").select("email").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load your contact choice.");
  const { saved } = await searchParams;
  return <><div className="page-heading"><span className="eyebrow">Your introduction</span><h1>Your profile.</h1><p>This is what eligible USC peers can learn about you.</p></div>{saved && <p role="status" className="message success">Your profile is saved.</p>}<article className="panel stack"><span className="badge">{profile!.active ? "Matching active" : "Matching paused"}</span><h2>{profile!.display_name}</h2><ProfileDetails profile={profile!} /><Link className="button secondary" href="/onboarding">Edit profile</Link></article><section className="panel stack"><h2>Your private contact choice</h2><p className="contact">{contact?.email}</p><p className="muted">Only you and a currently accepted partner can access this contact. Ending a partnership revokes access here; emails already shared cannot be recalled.</p><Link href="/settings">Manage matching & privacy</Link></section></>;
}
