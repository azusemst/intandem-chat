import Link from "next/link";
import { requireSession } from "@/lib/server/auth";
import { logoutAction } from "@/app/actions";
import { devEmailLogin } from "@/lib/dev-mode";
export const dynamic = "force-dynamic";
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <div className="workspace"><nav aria-label="Student navigation" className="student-nav"><Link href="/matches">Discover</Link><Link href="/requests">Requests</Link><Link href="/profile">Profile</Link><Link href="/settings">Settings</Link><form action={logoutAction}><button className="text-button">Sign out</button></form></nav><main id="main" className="page student-page">{devEmailLogin() && <p className="message">Local development · email ownership is not verified. Use fictional test data only.</p>}{children}</main></div>;
}
