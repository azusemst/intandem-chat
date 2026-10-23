export type Purpose = "career" | "technical" | "study";
export type Level = "beginner" | "intermediate" | "advanced";
export type Topic = { topic_key: string; label: string; kind: "practice" | "help"; level: Level };
export type Window = { day: number; start_time: string; end_time: string; timezone: string };
export type Candidate = {
  user_id: string;
  display_name: string;
  school: string;
  purpose: Purpose;
  goals: string[];
  interests: string[];
  industry: string | null;
  recruiting_stage: string | null;
  active: boolean;
  complete: boolean;
  eligible: boolean;
  version: number;
  topics: Topic[];
  availability: Window[];
};
export type Partnership = {
  id: string; sender: string; recipient: string;
  status: "pending" | "accepted" | "declined" | "canceled";
  created_at: string; updated_at: string;
};
