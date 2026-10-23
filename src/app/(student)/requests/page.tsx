import Link from "next/link";
import { ownProfile, readRequests } from "@/lib/server/data";
import { ActionForm } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import { transitionAction } from "@/app/actions";
export default async function Requests({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const { db, user } = await ownProfile(true);
  const requests = await readRequests(db);
  const ids = [...new Set(requests.flatMap(r => [r.sender,r.recipient]).filter(id => id !== user.id))];
  const names = new Map<string,string>();
  const contacts = new Map<string,string>();
  for (let start = 0; start < ids.length; start += 100) {
    const batch = ids.slice(start,start + 100);
    const [{ data: profiles, error: pe }, { data: emails, error: ce }] = await Promise.all([
      db.from("profiles").select("user_id,display_name").in("user_id", batch),
      // RLS checks currently accepted pairs at read time. Never source contact
      // data from a candidate response, client cache, or service-role client.
      db.from("private_contacts").select("user_id,email").in("user_id", batch),
    ]);
    if (pe || ce) throw new Error("Could not load authorized partnership details.");
    profiles.forEach(p => names.set(p.user_id,p.display_name));
    emails.forEach(c => contacts.set(c.user_id,c.email));
  }
  const groups = [
    { title: "Accepted partners", rows: requests.filter(r => r.status === "accepted") },
    { title: "Incoming requests", rows: requests.filter(r => r.status === "pending" && r.recipient === user.id) },
    { title: "Outgoing requests", rows: requests.filter(r => r.status === "pending" && r.sender === user.id) },
    { title: "Past requests", rows: requests.filter(r => ["declined","canceled"].includes(r.status)) },
  ];
  return <><div className="page-heading"><span className="eyebrow">Good connections start here</span><h1>Your requests.</h1><p>Accept an invitation to exchange your chosen contact emails. Together, you decide what happens next.</p></div><div className="section-label"><p className="hint">Refreshes every 15 seconds while this page is visible. Close or refresh this page to clear a previously displayed contact.</p><AutoRefresh /></div>
    {notice === "saved" && <p role="status" className="message success">Your connection request is saved. Its current status appears below.</p>}
    {requests.length === 0 && <section className="panel empty stack"><h2>Your next hello is waiting.</h2><p>No requests yet. Discover a few peers and make the first move.</p><Link className="button" href="/matches">Find a partner</Link></section>}
    {groups.map(group => <section key={group.title} className="request-group"><h2>{group.title} <span className="count">{group.rows.length}</span></h2>{group.rows.map(r => {
      const peer = r.sender === user.id ? r.recipient : r.sender;
      return <article key={r.id} className="panel stack small-gap"><div className="section-label"><h3>{names.get(peer) ?? "USC peer"}</h3><span className="badge">{r.status}</span></div><p className="hint">{r.sender === user.id ? "You sent an invitation" : "Invited you to connect"} · {new Date(r.created_at).toLocaleDateString("en-US",{ timeZone: "America/Los_Angeles", month:"short", day:"numeric", year:"numeric" })}</p>
        {r.status === "accepted" && <div className="privacy"><h3>Your partner’s contact</h3>{contacts.has(peer) ? <a className="contact" href={`mailto:${contacts.get(peer)}`}>{contacts.get(peer)}</a> : <p>Contact is unavailable. Refresh to check the partnership’s current status.</p>}<p className="hint">Mutual interest, not a booked session. Reach out to agree on a time. Ending this partnership revokes contact access in the app.</p></div>}
        <div className="inline-actions">{r.status === "pending" && r.recipient === user.id && <><ActionForm action={transitionAction} fields={{ request_id: r.id, expected_status: "pending", next_status:"accepted" }} label="Accept & share contacts" /><ActionForm action={transitionAction} fields={{ request_id:r.id, expected_status:"pending", next_status:"declined" }} label="Decline" secondary /></>}
        {(r.status === "accepted" || (r.status === "pending" && r.sender === user.id)) && <ActionForm action={transitionAction} fields={{ request_id:r.id, expected_status:r.status, next_status:"canceled" }} label={r.status === "accepted" ? "End partnership" : "Cancel request"} secondary />}
        {["declined","canceled"].includes(r.status) && <Link href="/matches">Explore partners or deliberately request again ↗</Link>}</div></article>;
    })}</section>)}
  </>;
}
