import { expect, it } from "vitest";
import { allowedEmail } from "../src/lib/identity";
import { profileSchema } from "../src/lib/validation/profile";
import { profileInput } from "./fixtures";
it("requires exact normalized email domain, not suffixes or lookalikes", () => {
  expect(allowedEmail(" Student@USC.EDU ")).toBe(true);
  for (const email of ["student@evilusc.edu","student@usc.edu.evil.test","student@alumni.usc.edu","student@@usc.edu","student @usc.edu"]) expect(allowedEmail(email)).toBe(false);
});
it("accepts Unicode and study profiles without recruiting answers", () => {
  expect(profileSchema.safeParse(profileInput({display_name:"李明 · José"})).success).toBe(true);
  expect(profileSchema.safeParse(profileInput({purpose:"career"})).success).toBe(false);
});
it("rejects overnight times with guidance and invalid IANA timezones", () => {
  const result = profileSchema.safeParse(profileInput({availability:[{day:1,start_time:"23:00",end_time:"01:00"}]}));
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues.some(i => i.message.includes("Split overnight"))).toBe(true);
  expect(profileSchema.safeParse(profileInput({timezone:"Fake/Zone"})).success).toBe(false);
});
it("requires practice topics, contact choice and availability", () => {
  for (const change of [{topics:[]},{contact_email:""},{availability:[]},{goals:[]}]) expect(profileSchema.safeParse(profileInput(change)).success).toBe(false);
});
