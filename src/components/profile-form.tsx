"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { saveProfileAction } from "@/app/actions";
import { splitList } from "@/lib/validation/profile";
import type { Candidate, Level, Purpose } from "@/lib/models";

const schools = ["Dornsife", "Marshall", "Viterbi", "Annenberg", "Architecture", "Cinematic Arts", "Dentistry", "Dramatic Arts", "Education", "Fine Arts", "Gerontology", "Gould Law", "Keck Medicine", "Music", "Pharmacy", "Price Public Policy", "Social Work", "Other USC school/program"];
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const zones = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "Pacific/Honolulu", "Europe/London", "Asia/Shanghai", "Asia/Kolkata", "Asia/Seoul", "Asia/Tokyo", "Australia/Sydney"];
export function ProfileForm({ profile, contactEmail = "", loginEmail }: { profile: Candidate | null; contactEmail?: string; loginEmail: string }) {
  const [state, action, pending] = useActionState(saveProfileAction, {});
  const [name, setName] = useState(profile?.display_name ?? "");
  const [school, setSchool] = useState(profile?.school ?? "");
  const [purpose, setPurpose] = useState<Purpose>(profile?.purpose ?? "study");
  const [goals, setGoals] = useState(profile?.goals.join(", ") ?? "");
  const [interests, setInterests] = useState(profile?.interests.join(", ") ?? "");
  const [industry, setIndustry] = useState(profile?.industry ?? "");
  const [stage, setStage] = useState(profile?.recruiting_stage ?? "");
  const [contact, setContact] = useState(contactEmail);
  const [zone, setZone] = useState(profile?.availability[0]?.timezone ?? "America/Los_Angeles");
  const [topics, setTopics] = useState(profile?.topics.map(t => ({ label: t.label, kind: t.kind, level: t.level })) ?? [{ label: "", kind: "practice" as "practice" | "help", level: "beginner" as Level }]);
  const [windows, setWindows] = useState(profile?.availability.map(w => ({ day: w.day, start_time: w.start_time.slice(0,5), end_time: w.end_time.slice(0,5) })) ?? [{ day: 1, start_time: "", end_time: "" }]);
  const [consent, setConsent] = useState(false);
  const customSchool = !schools.includes(school) && school !== "";
  const [other, setOther] = useState(customSchool);
  const payload = { display_name: name, school, purpose, goals: splitList(goals), interests: splitList(interests), industry, recruiting_stage: stage, contact_email: contact.trim(), timezone: zone, topics, availability: windows };
  return <form action={action} className="stack profile-form">
    <input type="hidden" name="profile" value={JSON.stringify(payload)} />
    <section className="panel stack">
      <div><span className="eyebrow">01 / Your introduction</span><h2>A little about you</h2><p className="muted">Start with what you want to practice. You can edit this anytime.</p></div>
      <label>Display name<input required maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="What should your partner call you?" /></label>
      <label>USC school or program<select value={other ? "Other USC school/program" : school} required onChange={e => { setOther(e.target.value === "Other USC school/program"); setSchool(e.target.value === "Other USC school/program" ? "" : e.target.value); }}><option value="">Choose your school or program</option>{schools.map(s => <option key={s}>{s}</option>)}</select></label>
      {other && <label>Your school or program<input value={school} onChange={e => setSchool(e.target.value)} required maxLength={120} placeholder="Any USC school or program is welcome" /></label>}
      <fieldset><legend>What brings you here?</legend><div className="choices">{([['study','Course study'],['technical','Technical practice'],['career','Career interviews']] as const).map(([value,label]) => <label key={value} className="choice"><input type="radio" name="purpose" value={value} checked={purpose === value} onChange={() => setPurpose(value)} />{label}</label>)}</div></fieldset>
      <label>Your goals <span className="muted">(separate with commas)</span><input required value={goals} onChange={e => setGoals(e.target.value)} maxLength={1000} placeholder="Understand calculus, prepare for finals" /></label>
      {purpose === "career" && <div className="two-col"><label>Target industry<input value={industry} onChange={e => setIndustry(e.target.value)} required maxLength={100} placeholder="e.g. Consulting" /></label><label>Recruiting stage<input value={stage} onChange={e => setStage(e.target.value)} required maxLength={100} placeholder="e.g. Internship interviews" /></label></div>}
      <label>Interests <span className="muted">(optional, separate with commas)</span><input value={interests} onChange={e => setInterests(e.target.value)} maxLength={2000} placeholder="Music, hiking, design" /></label>
    </section>
    <section className="panel stack"><div><span className="eyebrow">02 / Topics & strengths</span><h2>What’s on your practice list?</h2><p className="muted">Add at least one practice topic. Offering help is optional.</p></div>
      {topics.map((t, index) => <fieldset className="repeat-row" key={index}><legend>Topic {index + 1}</legend>
        <label>Topic or course<input required maxLength={100} value={t.label} placeholder="e.g. CSCI 104, behavioral interviews" onChange={e => setTopics(v => v.map((x,i) => i === index ? { ...x, label: e.target.value } : x))} /></label>
        <div className="two-col"><label>Intent<select value={t.kind} onChange={e => setTopics(v => v.map((x,i) => i === index ? { ...x, kind: e.target.value as "practice" | "help" } : x))}><option value="practice">I want to practice</option><option value="help">I can offer help</option></select></label>
        <label>Current level<select value={t.level} onChange={e => setTopics(v => v.map((x,i) => i === index ? { ...x, level: e.target.value as Level } : x))}>{["beginner","intermediate","advanced"].map(l => <option key={l}>{l}</option>)}</select></label></div>
        {topics.length > 1 && <button type="button" className="text-button" onClick={() => setTopics(v => v.filter((_,i) => i !== index))}>Remove topic {index + 1}</button>}
      </fieldset>)}
      {topics.length < 20 && <button type="button" className="button secondary" onClick={() => setTopics(v => [...v, { label: "", kind: "practice", level: "beginner" }])}>+ Add a topic</button>}
    </section>
    <section className="panel stack"><div><span className="eyebrow">03 / Make time to connect</span><h2>Your usual availability</h2><p className="muted">Weekly availability helps us rank peers. A partnership is mutual interest, not a booked session.</p></div>
      <label>Timezone<input list="timezones" required value={zone} onChange={e => setZone(e.target.value)} placeholder="America/Los_Angeles" /><datalist id="timezones">{zones.map(z => <option key={z} value={z} />)}</datalist></label><p className="hint">Use an IANA timezone. For overnight availability, add a window on each day.</p>
      {windows.map((w,index) => <fieldset className="repeat-row" key={index}><legend>Window {index + 1}</legend><label>Day<select value={w.day} onChange={e => setWindows(v => v.map((x,i) => i === index ? { ...x, day: Number(e.target.value) } : x))}>{days.map((d,i) => <option key={d} value={i}>{d}</option>)}</select></label><div className="two-col"><label>From<input type="time" required value={w.start_time} onChange={e => setWindows(v => v.map((x,i) => i === index ? { ...x, start_time: e.target.value } : x))} /></label><label>Until<input type="time" required value={w.end_time} onChange={e => setWindows(v => v.map((x,i) => i === index ? { ...x, end_time: e.target.value } : x))} /></label></div>{windows.length > 1 && <button type="button" className="text-button" onClick={() => setWindows(v => v.filter((_,i) => i !== index))}>Remove window {index + 1}</button>}</fieldset>)}
      {windows.length < 21 && <button type="button" className="button secondary" onClick={() => setWindows(v => [...v, { day: 1, start_time: "", end_time: "" }])}>+ Add availability</button>}
    </section>
    <section className="panel stack"><div><span className="eyebrow">04 / Your contact choice</span><h2>Connect on your terms</h2></div>
      <label>Email to share after mutual acceptance<input type="email" required maxLength={254} value={contact} onChange={e => setContact(e.target.value)} autoComplete="email" placeholder="An email you choose to share" /></label>
      <button type="button" className="text-button" onClick={() => setContact(loginEmail)}>Use my USC login email as my contact</button>
      <div className="privacy"><h3>Who can see what?</h3><p>Verified USC email users can see your display name, school/program, goals, topic levels, interests, relevant recruiting fields, and availability while matching is active. Email verification is not proof of current enrollment.</p><p>Your chosen contact email is shared only with a participant in a currently accepted partnership. Your login email stays private unless you choose it above. You can pause matching or request profile removal in <Link href="/settings">Settings</Link>.</p></div>
      <label className="checkbox"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} />I understand how my profile and chosen contact email will be shared.</label>
    </section>
    <div aria-live="polite">{state.error && <p role="alert" className="message error">{state.error}</p>}</div>
    <button className="button" disabled={pending || !consent}>{pending ? "Saving your profile…" : profile ? "Save profile" : "Save & find practice partners"}</button>
  </form>;
}
