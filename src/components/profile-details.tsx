import type { Candidate } from "@/lib/models";
const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export function ProfileDetails({ profile: p }: { profile: Candidate }) {
  return <div className="stack small-gap">
    <p>{p.school} <span aria-hidden="true">·</span> {p.purpose === "study" ? "Course study" : p.purpose === "career" ? "Career interviews" : "Technical practice"}</p>
    <p><strong>Goals:</strong> {p.goals.join(", ")}</p>
    {p.industry && <p><strong>Industry:</strong> {p.industry} · {p.recruiting_stage}</p>}
    <div className="tags">{p.topics.map(t => <span className="tag" key={`${t.topic_key}:${t.kind}`}>{t.label} · {t.level}{t.kind === "help" ? " · offers help" : ""}</span>)}</div>
    {p.interests.length > 0 && <p><strong>Interests:</strong> {p.interests.join(", ")}</p>}
    <details><summary>Weekly availability</summary><ul>{p.availability.map((w,i) => <li key={i}>{days[w.day]} {w.start_time.slice(0,5)}–{w.end_time.slice(0,5)} · {w.timezone}</li>)}</ul></details>
  </div>;
}
