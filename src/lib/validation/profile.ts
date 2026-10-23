import { z } from "zod";

export const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/gu, " ");
const shortText = z.string().trim().min(1).max(100);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.");
const topic = z.object({ label: shortText, kind: z.enum(["practice", "help"]), level: z.enum(["beginner", "intermediate", "advanced"]) });
export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Enter your display name.").max(80),
  school: z.string().trim().min(1, "Choose your school or program.").max(120),
  purpose: z.enum(["career", "technical", "study"]),
  goals: z.array(shortText).min(1, "Add at least one goal.").max(10),
  interests: z.array(shortText).max(20),
  industry: z.string().trim().max(100),
  recruiting_stage: z.string().trim().max(100),
  contact_email: z.email("Enter the contact email you agree to share.").max(254).transform(v => v.toLowerCase()),
  timezone: z.string().refine(value => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return !/^[+-]/.test(value); } catch { return false; }
  }, "Choose a valid IANA timezone, such as America/Los_Angeles."),
  topics: z.array(topic).min(1).max(20).refine(v => v.some(t => t.kind === "practice"), "Add at least one practice topic.")
    .refine(v => new Set(v.map(t => `${normalize(t.label)}:${t.kind}`)).size === v.length, "Remove duplicate topics of the same kind."),
  availability: z.array(z.object({ day: z.number().int().min(0).max(6), start_time: time, end_time: time })
    .refine(w => w.start_time < w.end_time, "End time must follow start time. Split overnight windows across two days."))
    .min(1, "Add at least one availability window.").max(21)
    .refine(v => new Set(v.map(w => `${w.day}:${w.start_time}:${w.end_time}`)).size === v.length, "Remove duplicate availability windows."),
}).superRefine((p, ctx) => {
  if (p.purpose === "career") {
    for (const field of ["industry", "recruiting_stage"] as const) {
      if (!p[field]) ctx.addIssue({ code: "custom", path: [field], message: "Required for career practice." });
    }
  }
});
export type ProfileInput = z.infer<typeof profileSchema>;
export const splitList = (value: string) => [...new Set(value.split(",").map(normalize).filter(Boolean))];
