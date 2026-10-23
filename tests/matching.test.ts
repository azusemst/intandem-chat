import { describe, expect, it } from "vitest";
import { recommend, overlapMinutes, DEFAULT_WEIGHTS } from "../src/lib/server/matching";
import { candidate, ids, request } from "./fixtures";
import type { Candidate } from "../src/lib/models";
const now = "2026-10-22T12:00:00Z";
const viewer = candidate(ids.alice);
function rank(candidates: Candidate[], extra: Partial<Parameters<typeof recommend>[0]> = {}) {
  return recommend({ viewer, candidates, now, ...extra });
}
describe("deterministic recommendations without external services", () => {
  it("excludes self, inactive, incomplete, ineligible and duplicates", () => {
    const pool = [viewer,candidate("inactive",{active:false}),candidate("incomplete",{complete:false}),candidate("wrong-domain",{eligible:false}),candidate(ids.bob),candidate(ids.bob)];
    expect(rank(pool).map(r => r.candidate.user_id)).toEqual([ids.bob]);
  });
  it("excludes pending/accepted pairs in either direction, but permits deliberate replacements", () => {
    for (const status of ["pending","accepted"] as const) for (const reverse of [false,true]) {
      expect(rank([candidate(ids.bob)], { requests:[reverse ? request(ids.bob,ids.alice,status) : request(ids.alice,ids.bob,status)] })).toEqual([]);
    }
    for (const status of ["declined","canceled"] as const) expect(rank([candidate(ids.bob)], { requests:[request(ids.alice,ids.bob,status)] })).toHaveLength(1);
  });
  it("allows mismatched topics, interests, purpose, level and availability", () => {
    const different = candidate(ids.bob,{purpose:"career",goals:["get an internship"],interests:["rowing"],industry:"finance",recruiting_stage:"internship",topics:[{topic_key:"finance",label:"Finance",kind:"practice",level:"advanced"}],availability:[{day:3,start_time:"01:00",end_time:"02:00",timezone:"Asia/Tokyo"}]});
    const [result] = rank([different]);
    expect(result.score).toBe(0); expect(result.reasons).toEqual([]); expect(result.scheduling).toContain("No availability overlap");
  });
  it("returns no matches only for an exhausted eligible pool and honors dismissal", () => {
    expect(rank([])).toEqual([]);
    expect(rank([candidate(ids.bob)],{dismissed:[ids.bob]})).toEqual([]);
    expect(rank([candidate(ids.bob)],{viewer:candidate(ids.alice,{active:false})})).toEqual([]);
  });
  it("returns up to three with stable ID tie-breaking independent of input order", () => {
    const pool = ["e","b","d","c"].map(id => candidate(id));
    expect(rank(pool).map(r => r.candidate.user_id)).toEqual(["b","c","d"]);
    expect(rank(pool.reverse()).map(r => r.candidate.user_id)).toEqual(["b","c","d"]);
  });
  it("uses the configured weights and caps each component at 1", () => {
    expect(DEFAULT_WEIGHTS).toEqual({goalsTopics:30,interests:25,industryStage:20,level:10,availability:15});
    const career = candidate(ids.alice,{purpose:"career",industry:"technology",recruiting_stage:"internship",availability:[{day:1,start_time:"10:00",end_time:"13:00",timezone:"America/Los_Angeles"}]});
    expect(rank([{...career,user_id:ids.bob}],{viewer:career})[0].score).toBe(100);
    expect(rank([candidate(ids.bob)],{weights:{goalsTopics:0,interests:4,industryStage:0,level:0,availability:0}})[0].score).toBe(4);
    expect(() => rank([candidate(ids.bob)],{weights:{...DEFAULT_WEIGHTS,level:-1}})).toThrow();
  });
  it("changes rankings after profile edits without a cache or AI configuration", () => {
    const a = candidate(ids.bob), b = candidate(ids.cara,{goals:["calculus"],interests:["painting"],topics:[{label:"Calculus",topic_key:"calculus",kind:"practice",level:"advanced"}]});
    expect(rank([a,b])[0].candidate.user_id).toBe(ids.bob);
    expect(rank([a,b],{viewer:{...b,user_id:ids.alice,version:2}})[0].candidate.user_id).toBe(ids.cara);
  });
  it("does not fabricate shared fields or levels when attributes are absent", () => {
    const empty = candidate(ids.bob,{goals:[],interests:[],topics:[],availability:[]});
    const [result] = rank([empty]); expect(result.score).toBe(0); expect(result.reasons).toEqual([]); expect(result.scheduling).toContain("missing");
  });
  it("derives factual reasons only from shared fields", () => {
    const [result] = rank([candidate(ids.bob)]);
    expect(result.reasons).toContain("Shared practice: csci 104");
    expect(result.reasons).toContain("Shared goal: understand algorithms");
    expect(result.reasons).toContain("Shared interest: music");
    expect(result.reasons.some(r => r.includes("60 minutes"))).toBe(true);
    expect(result.reasons.some(r => /industry|stage/.test(r))).toBe(false);
  });
  it("uses optional help as a signal without requiring a teaching exchange", () => {
    const helping = candidate(ids.bob,{goals:[],interests:[],availability:[],topics:[{label:"CSCI 104",topic_key:"csci 104",kind:"help",level:"advanced"}]});
    expect(rank([helping])[0].score).toBeGreaterThan(0);
    expect(rank([candidate(ids.bob,{topics:[]})])).toHaveLength(1);
  });
});
describe("availability across IANA timezones and daylight saving", () => {
  it("compares real instants across different local times", () => {
    expect(overlapMinutes(viewer.availability,[{day:1,start_time:"13:00",end_time:"14:00",timezone:"America/New_York"}],now)).toBe(60);
  });
  it("accounts for spring-forward and fall-back duration", () => {
    const sunday = [{day:0,start_time:"01:00",end_time:"04:00",timezone:"America/Los_Angeles"}];
    expect(overlapMinutes(sunday,sunday,"2026-03-08T08:00:00Z")).toBe(120);
    const fall = [{day:0,start_time:"01:00",end_time:"03:00",timezone:"America/Los_Angeles"}];
    expect(overlapMinutes(fall,fall,"2026-11-01T07:00:00Z")).toBe(180);
  });
  it("does not double count overlapping windows", () => {
    expect(overlapMinutes([...viewer.availability,...viewer.availability],viewer.availability,now)).toBe(60);
  });
  it("clips elapsed time and excludes an eighth calendar day", () => {
    expect(overlapMinutes(viewer.availability,viewer.availability,"2026-10-26T17:30:00Z")).toBe(30);
  });
  it("handles weekly day boundaries across the international date line", () => {
    expect(overlapMinutes([{day:0,start_time:"20:00",end_time:"21:00",timezone:"America/Los_Angeles"}],[{day:1,start_time:"12:00",end_time:"13:00",timezone:"Asia/Tokyo"}],now)).toBe(60);
  });
});
