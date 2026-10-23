import { Temporal } from "@js-temporal/polyfill";
import type { Candidate, Partnership, Window } from "@/lib/models";
import { normalize } from "@/lib/validation/profile";

export const DEFAULT_WEIGHTS = { goalsTopics: 30, interests: 25, industryStage: 20, level: 10, availability: 15 };
type Weights = typeof DEFAULT_WEIGHTS;
type Interval = [number, number];
export type Recommendation = { candidate: Candidate; score: number; reasons: string[]; overlapMinutes: number; scheduling: string };
const intersection = (a: string[], b: string[]) => [...new Set(a.map(normalize))].filter(x => b.map(normalize).includes(x));
const similarity = (a: string[], b: string[]) => {
  const union = new Set([...a, ...b].map(normalize));
  return union.size ? intersection(a, b).length / union.size : 0;
};
function merge(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [start, end] of intervals.sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else result.push([start, end]);
  }
  return result;
}
// One common horizon: today through the following six calendar days in the
// viewer's timezone. Convert each participant's local recurring windows to
// instants independently. Temporal handles offsets and DST; nonexistent/ambiguous
// wall times use its documented compatible disambiguation (later/earlier).
export function availabilityIntervals(windows: Window[], start: number, end: number): Interval[] {
  const intervals: Interval[] = [];
  for (const w of windows) {
    const localStart = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(w.timezone).toPlainDate();
    for (let offset = -1; offset <= 8; offset++) {
      const date = localStart.add({ days: offset });
      if (date.dayOfWeek % 7 !== w.day) continue;
      const s = date.toZonedDateTime({ timeZone: w.timezone, plainTime: w.start_time }).epochMilliseconds;
      const e = date.toZonedDateTime({ timeZone: w.timezone, plainTime: w.end_time }).epochMilliseconds;
      const clipped: Interval = [Math.max(s, start), Math.min(e, end)];
      if (clipped[1] > clipped[0]) intervals.push(clipped);
    }
  }
  return merge(intervals);
}
export function overlapMinutes(a: Window[], b: Window[], now: string): number {
  const instant = Temporal.Instant.from(now);
  const viewerDay = instant.toZonedDateTimeISO(a[0]?.timezone ?? "America/Los_Angeles").startOfDay();
  const end = viewerDay.add({ days: 7 }).epochMilliseconds;
  const left = availabilityIntervals(a, instant.epochMilliseconds, end);
  const right = availabilityIntervals(b, instant.epochMilliseconds, end);
  let milliseconds = 0;
  for (const x of left) for (const y of right) milliseconds += Math.max(0, Math.min(x[1], y[1]) - Math.max(x[0], y[0]));
  return milliseconds / 60000;
}
export function recommend({ viewer, candidates, requests = [], dismissed = [], now, weights = DEFAULT_WEIGHTS }: {
  viewer: Candidate; candidates: Candidate[]; requests?: Partnership[]; dismissed?: string[]; now: string; weights?: Weights;
}): Recommendation[] {
  if (!viewer.eligible || !viewer.active || !viewer.complete) return [];
  if (Object.values(weights).some(v => !Number.isFinite(v) || v < 0)) throw new Error("Weights must be finite and nonnegative");
  const blocked = new Set(dismissed);
  for (const r of requests) if (["pending", "accepted"].includes(r.status)) {
    if (r.sender === viewer.user_id) blocked.add(r.recipient);
    if (r.recipient === viewer.user_id) blocked.add(r.sender);
  }
  const unique = new Map(candidates.map(c => [c.user_id, c]));
  return [...unique.values()].filter(c => c.user_id !== viewer.user_id && c.eligible && c.active && c.complete && !blocked.has(c.user_id))
    .map(candidate => {
      const practice = (c: Candidate) => c.topics.filter(t => t.kind === "practice");
      const myTopics = practice(viewer), theirTopics = practice(candidate);
      const sharedTopics = intersection(myTopics.map(t => t.topic_key), theirTopics.map(t => t.topic_key));
      const sharedGoals = intersection(viewer.goals, candidate.goals);
      const sharedInterests = intersection(viewer.interests, candidate.interests);
      const sameIndustry = !!viewer.industry && !!candidate.industry && normalize(viewer.industry) === normalize(candidate.industry);
      const sameStage = !!viewer.recruiting_stage && !!candidate.recruiting_stage && normalize(viewer.recruiting_stage) === normalize(candidate.recruiting_stage);
      const career = viewer.purpose === "career" && candidate.purpose === "career";
      const similarLevels = sharedTopics.filter(key => myTopics.find(t => t.topic_key === key)?.level === theirTopics.find(t => t.topic_key === key)?.level);
      const minutes = overlapMinutes(viewer.availability, candidate.availability, now);
      // Optional help contributes as a structured topic signal, never a requirement.
      const components = {
        goalsTopics: (similarity(viewer.goals, candidate.goals) + similarity(viewer.topics.map(t => t.topic_key), candidate.topics.map(t => t.topic_key))) / 2,
        interests: similarity(viewer.interests, candidate.interests),
        industryStage: career ? (Number(sameIndustry) + Number(sameStage)) / 2 : 0,
        level: sharedTopics.length ? similarLevels.length / sharedTopics.length : 0,
        availability: Math.min(minutes / 120, 1),
      };
      const score = (Object.keys(weights) as (keyof Weights)[]).reduce((sum, key) => sum + weights[key] * components[key], 0);
      const reasons: string[] = [];
      if (sharedTopics.length) reasons.push(`Shared practice: ${sharedTopics.join(", ")}`);
      const helpConnections = intersection(viewer.topics.map(t => t.topic_key), candidate.topics.map(t => t.topic_key)).filter(key => !sharedTopics.includes(key));
      if (helpConnections.length) reasons.push(`Topic connection with help offered: ${helpConnections.join(", ")}`);
      if (sharedGoals.length) reasons.push(`Shared goal: ${sharedGoals.join(", ")}`);
      if (sharedInterests.length) reasons.push(`Shared interest: ${sharedInterests.join(", ")}`);
      if (career && sameIndustry) reasons.push(`Same target industry: ${candidate.industry}`);
      if (career && sameStage) reasons.push(`Same recruiting stage: ${candidate.recruiting_stage}`);
      if (similarLevels.length) reasons.push(`Same practice level in ${similarLevels.join(", ")}`);
      if (minutes > 0) reasons.push(`${Math.floor(minutes)} minutes of availability overlap in the next seven calendar days`);
      const scheduling = !viewer.availability.length || !candidate.availability.length ? "Scheduling information is missing."
        : minutes > 0 ? "Overlap reflects the next seven calendar days; agree on a time together."
          : "No availability overlap in the next seven calendar days. You can still connect and arrange a time.";
      return { candidate, score, reasons, overlapMinutes: minutes, scheduling };
    }).sort((a, b) => b.score - a.score || (a.candidate.user_id < b.candidate.user_id ? -1 : a.candidate.user_id > b.candidate.user_id ? 1 : 0)).slice(0, 3);
}
