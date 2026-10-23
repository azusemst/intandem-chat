import type { Candidate, Partnership } from "../src/lib/models";
import type { ProfileInput } from "../src/lib/validation/profile";
export const ids = {
  alice:"00000000-0000-4000-8000-000000000001", bob:"00000000-0000-4000-8000-000000000002", cara:"00000000-0000-4000-8000-000000000003",
  wrong:"00000000-0000-4000-8000-000000000004", unconfirmed:"00000000-0000-4000-8000-000000000005", banned:"00000000-0000-4000-8000-000000000006",
};
export function profileInput(overrides: Partial<ProfileInput> = {}): ProfileInput {
  return {
    display_name:"FICTIONAL TEST STUDENT", school:"Other USC test program", purpose:"study", goals:["understand algorithms"], interests:["music"],
    industry:"", recruiting_stage:"", contact_email:"fictional@example.test", timezone:"America/Los_Angeles",
    topics:[{label:"CSCI 104",kind:"practice",level:"beginner"}],
    availability:[{day:1,start_time:"10:00",end_time:"11:00"}], ...overrides,
  };
}
export function candidate(user_id: string, overrides: Partial<Candidate> = {}): Candidate {
  return {
    user_id,display_name:"FICTIONAL TEST STUDENT",school:"Other USC test program",purpose:"study",goals:["understand algorithms"], interests:["music"],
    industry:null,recruiting_stage:null,active:true,complete:true,eligible:true,version:1,
    topics:[{topic_key:"csci 104",label:"CSCI 104",kind:"practice",level:"beginner"}],
    availability:[{day:1,start_time:"10:00",end_time:"11:00",timezone:"America/Los_Angeles"}],...overrides,
  };
}
export function request(sender: string, recipient: string, status: Partnership["status"] = "pending"): Partnership {
  return {id:ids.cara,sender,recipient,status,created_at:"2026-10-22T12:00:00Z",updated_at:"2026-10-22T12:00:00Z"};
}
