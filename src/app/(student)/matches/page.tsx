import Link from "next/link";
import { candidates, ownProfile, readRequests } from "@/lib/server/data";
import { recommend } from "@/lib/server/matching";
import { ActionForm } from "@/components/action-form";
import { ProfileDetails } from "@/components/profile-details";
import { dismissAction, requestAction, settingsAction } from "@/app/actions";
export default async function Matches() {
  const { db, profile } = await ownProfile(true);
  if (!profile!.active) return <><h1>A pause is part of progress.</h1><div className="panel stack"><p>Matching is paused. Your existing requests and partnerships are still available.</p><Link className="button" href="/settings">Manage matching</Link><Link href="/requests">View requests</Link></div></>;
  const [pool, requests] = await Promise.all([candidates(db), readRequests(db)]);
  const dismissed: string[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db.from("recommendation_dismissals").select("candidate_id").order("candidate_id").range(start, start + 499);
    if (error) throw new Error("Could not load recommendations.");
    dismissed.push(...data.map(d => d.candidate_id)); if (data.length < 500) break;
  }
  const recommendations = recommend({ viewer: profile!, candidates: pool, requests, dismissed, now: new Date().toISOString() });
  return <><div className="page-heading"><span className="eyebrow">A shared goal is a good start</span><h1>Find your next<br /><em>practice partner.</em></h1><p>Up to three USC peers, ranked from your profile and availability. Explore the reasons, then say hello.</p></div>
    <div className="section-label"><h2>People to meet</h2><Link href="/onboarding">Edit preferences ↗</Link></div>
    {!recommendations.length ? <section className="panel empty stack"><span className="empty-mark" aria-hidden="true">↗</span><h2>No new peers just yet.</h2><p>There are no eligible, non-dismissed peers available right now. Check your requests, update your profile, or retry later.</p><Link className="button" href="/matches">Retry recommendations</Link><Link href="/onboarding">Edit your profile</Link>{dismissed.length > 0 && <ActionForm action={settingsAction} fields={{ operation: "reset" }} label="Reconsider dismissed peers" secondary />}</section>
      : <div className="match-grid">{recommendations.map(({ candidate: c, score, reasons, scheduling }) => <article className="panel match-card stack" key={c.user_id}><div className="card-top"><span className="avatar" aria-hidden="true">{[...c.display_name][0]}</span><span className="badge">{score > 0 ? "A few things in common" : "Another eligible USC peer"}</span></div><h2>{c.display_name}</h2><ProfileDetails profile={c} />{reasons.length > 0 && <div className="reasons"><h3>Why this peer?</h3><ul>{reasons.map(r => <li key={r}>{r}</li>)}</ul></div>}<p className="hint">{scheduling}</p><div className="card-actions"><ActionForm action={requestAction} fields={{ candidate: c.user_id }} label="Request to connect" /><ActionForm action={dismissAction} fields={{ candidate: c.user_id }} label="See another peer" secondary /></div></article>)}</div>}
    <p className="hint">These are profile-based suggestions, not fit probabilities. Different goals or schedules never disqualify an otherwise eligible peer. Contact emails are shared only after mutual acceptance.</p>
  </>;
}
