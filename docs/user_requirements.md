# USC Peer Practice User Requirements

## Purpose and source

Help USC students find suitable peers for mock interviews, technical walkthroughs, and study practice. Validate partner matching in the MVP, then add built-in human practice calls and AI feedback in a later release.

Source: [PRD.docx](PRD.docx), including its English and Chinese content. The PRD explicitly ranks AI partner matching first, AI feedback on human mock interviews second, and ongoing practice and networking features as additional functionality. Its goals, experiment plan, and delivery milestones are blank.

The user's clarifications on October 22, 2026 override the PRD where they differ:

- **MVP goal:** Validate general, rules-based partner recommendations first. AI-assisted recommendations and AI interview feedback are deferred. The MVP needs no AI provider, model, API key, or AI service budget.
- **Deadline:** The MVP is due this week; the exact submission date and time are not specified.
- **Audience:** All verified USC students, with no MSBA-only restriction.
- **Budget:** Limited; an amount has not been set.
- **Calls:** Built-in video or audio calls belong to the next release, not this week's matching MVP. The user explicitly confirmed this sequencing.

Requirements marked **PRD** come directly from the source; **User** reflects these decisions; **Derived** makes the stated workflow usable; **Proposed** is a recommendation. Remaining stage assignments are recommendations. Acceptance criteria describe observable behavior rather than a technology stack.

## Users and intended outcome

- **Primary user:** Any verified USC student seeking a peer with compatible recruiting or study goals, interests, skills, and availability.
- **Practice partner:** Another student who can participate in mock interviews or help with technical or course material. The same user can play either role.
- **MVP outcome:** Students can enter their goals, receive relevant partner recommendations, and mutually accept a suitable match.
- **Later outcome:** Matched students can schedule and conduct practice inside the app and receive useful AI feedback.

The PRD reports that 72.4% of survey respondents identified interview preparation or career skill development as a frustration. It does not provide the survey size, wording, or evidence that matching is the main cause. It also does not establish that the result generalizes to all USC students. Treat this as motivation rather than a validated product success measure.

## Release scope

| Stage | Intended scope | Reason |
| --- | --- | --- |
| **MVP this week** | Verified USC access, manually entered profiles and availability, rules-based partner recommendations using interests, goals, industries, skills, and availability, accepting or changing partners, and a basic way to coordinate after mutual acceptance. | Tests whether students find the suggested partners suitable within a limited budget. |
| **Later stage 2 next release** | Built-in video or audio calls, basic session scheduling, and AI feedback on real peer interviews. | Adds the chosen practice experience after validating matching. Calls are confirmed for this release; the exact timing of AI feedback within this stage remains proposed. |
| **Later stage 2 enhancements** | AI-assisted partner recommendations, resume extraction, external profile and calendar connections, AI scheduling, richer study workflows, peer ratings, partner chat, and ongoing coaching. | Adds convenience and repeat use after matching works. These features need not all ship with the first calling release. |
| **Later stage 3** | Streaks, leaderboards, physical rewards, and monetization experiments. | Requires evidence of sustained use and additional operating decisions. |
| **Later candidate requiring a separate decision** | Discussion posts or a community feed. | The PRD itself questions whether this would distract from the product purpose. |

**Recommended MVP boundary:** Use manual profile and availability entry to avoid document parsing and calendar integrations this week. Keep career, technical, and course goals representable, while testing a small set of practice categories. Provide a simple, mutually agreed contact handoff after acceptance. Full session scheduling, built-in calls, recording, transcription, AI interview assessment, peer ratings, chat, and payments are outside this week's MVP. MVP ranking uses deterministic rules and factual compatibility reasons. Interests, goals, industries, skills, and availability are ranking signals, not mandatory overlap requirements. Only eligibility and participation-state rules exclude candidates. AI-assisted matching is a later enhancement.

**Cost constraint:** Keep the MVP inexpensive. The budget ceiling, expected pilot size, and available team capacity remain to be confirmed before selecting services and estimating operating costs.

## MVP user requirements

### Access and profile creation

| ID | Requirement | Basis and source | Acceptance criteria |
| --- | --- | --- | --- |
| MVP-01 | As a USC student, I can verify my eligibility before participating in matching. | **PRD:** Student verification. **User:** All USC students are eligible. | An unverified account cannot enter matching. A verified USC student can continue regardless of school or major. MSBA membership is not required. The accepted verification method remains to be chosen; USC email verification is a proposed lightweight option whose limitations need agreement. |
| MVP-02 | As a student, I can manually enter and update the information needed to find a suitable partner. | **PRD:** Solution summary, AI matching, core product flow step 1. **Proposed:** Manual entry only for this week. | A student can enter skills, self-assessed skill levels, interests, and practice goals. Target industry and recruiting stage apply to career goals; course or technical topics apply to study goals. Career-only fields do not block a study-oriented profile. Updates affect subsequent matching. Required fields and skill-level definitions must be agreed. |
| MVP-04 | As a student, I can provide available practice times. | **Derived:** Scheduling compatibility. **Proposed:** Manual availability for the MVP. | A student can enter and update available time ranges with a stated timezone. Availability can inform partner suitability; entering it does not create a scheduled session. No calendar connection is required. |

Requirement IDs retained from the first draft are unchanged. MVP-03 and MVP-08 through MVP-16 have moved to later stages or been replaced by the narrower profile controls below; their former scope is not an MVP commitment.

### Partner matching and coordination

| ID | Requirement | Basis and source | Acceptance criteria |
| --- | --- | --- | --- |
| MVP-05 | As a student, I receive general, rules-based recommendations for suitable human practice partners. | **PRD:** Solution summary, core product flow step 2, first core priority. **User:** General recommendations now; AI assistance later. | Deterministic recommendations rank eligible candidates by interests, goals, industries, skills, level, recruiting stage where relevant, and availability. These are ranking signals; shared topics and overlapping availability are not mandatory. Only verified USC students are recommended, and users are not matched to themselves. Recommendations show factual compatibility reasons derived from shared fields. If there is no availability overlap, say so; do not imply a confirmed compatible schedule. Missing optional fields do not count as shared attributes. Stable tie-breaking makes equal-scoring results reproducible. No AI provider or AI-generated text is required. Similar versus complementary skill matching remains a decision. Cross-major matching is allowed; major is not an eligibility restriction. |
| MVP-06 | As a student, I can accept or decline a recommended partner and request another partner. | **PRD:** Core product flow step 3. | A student can accept, decline, or request a replacement without editing their profile. The interface distinguishes a recommendation from an agreed partnership. Both students must accept before a partnership is confirmed (**Proposed**). |
| MVP-07 | As a student, I receive a clear outcome when no suitable partner is currently available. | **Derived:** Matching within a limited student community. | The interface explains that no current match is available and allows the student to revise preferences or retry. It does not present an unsuitable or nonexistent partner as a successful match. |
| MVP-17 | As a mutually matched student, I can coordinate a next step with my partner. | **Derived:** Making an accepted match usable. **Proposed:** Contact handoff rather than full chat this week. | After mutual acceptance, each student can see the contact method the other agreed to share. Before acceptance, that contact information is hidden. The MVP need not schedule or host a practice session. |

### Proposed profile controls

These requirements are recommendations for the matching MVP. Recording and session-data controls move with the later practice release.

| ID | Requirement | Basis | Acceptance criteria |
| --- | --- | --- | --- |
| MVP-18 | As a student, I know which profile information is visible and how it is used for matching. | **Proposed** | The product explains which fields are shared with potential partners and which are used by rules-based matching. Verification information is not exposed as public profile data. Contact details follow MVP-17. |
| MVP-19 | As a student, I can leave the matching pool and request removal of my profile. | **Proposed** | A student has a documented way to stop receiving recommendations and request profile removal. Before the pilot, the product defines retention and deletion behavior; no retention period is assumed here. |

## Later-stage user requirements

Built-in calls are confirmed for the next release. Other later-stage sequencing is proposed and has no committed date. Features phrased as questions in the PRD remain experiments rather than agreed requirements.

### Built-in practice and AI feedback

| ID | Stage | User requirement | Acceptance criteria and source |
| --- | --- | --- | --- |
| L-15 | **Later stage 2 next release** | As a matched pair, we can conduct a human practice session using video or audio calls built into the app. | **User:** Chosen meeting format, explicitly deferred until after this week's matching MVP. Both partners can join the same in-app call and hear each other, end the call, and see connection failures. Whether audio alone is sufficient or video must also ship remains open. An external meeting link does not satisfy the built-in-call requirement. Replaces the practice portion of former MVP-09. |
| L-16 | **Later stage 2** | As a matched pair, we can agree on a practice session. | **PRD:** Built-in scheduling. One student proposes a date, time, duration, and topic; the other confirms. Both see pending, confirmed, rescheduled, and canceled states with an explicit timezone. Manual scheduling is sufficient initially. Former MVP-08. |
| L-17 | **Later stage 2** | As participants, we can choose to have our human interview captured and transcribed for AI analysis. | **PRD:** AI observes the full human interview. **Proposed:** Both participants consent before capture, see recording status, and can stop it. Capture is linked to the correct session and participants. Recording and analysis consent are separate from agreeing to join a call. Former MVP-10 and MVP-14. |
| L-18 | **Later stage 2** | As a participant, I receive AI feedback on my interview performance. | **PRD:** Second core priority. Feedback gives a performance summary and specific improvement suggestions based on the actual human interaction, rather than only a meeting summary. Strengths, improvement areas, and supporting examples are a proposed structure. Numeric scores require an agreed rubric. Live versus post-session feedback remains undecided. Former MVP-11 and the AI-observer portion of MVP-09. |
| L-19 | **Later stage 2** | As a participant, I can revisit my session details and feedback and understand failures. | **Derived:** Feedback and accountability. Past session information and available feedback can be reopened. Completed, canceled, and failed sessions are distinguishable. Capture or analysis failure provides a clear next step and does not produce a fabricated assessment. Former MVP-12 and MVP-13. |
| L-20 | **Later stage 2** | As a participant, I know who can access my recordings, transcripts, and feedback and how to remove them. | **Proposed:** Define recipient-only versus partner-shared feedback, retention periods, access restrictions, and deletion of shared material before recording launches. Unrelated students cannot access private session materials. Session-data portions of former MVP-15 and MVP-16. |

### Integrations and ongoing practice

| ID | Stage | User requirement | Source and scope notes |
| --- | --- | --- | --- |
| L-22 | **Later stage 2 enhancement** | As a student, I can receive AI-assisted partner ranking and fit explanations. | **PRD:** AI partner matching, deferred by the user. Select an AI provider, model, budget, and evaluation approach only when this stage is implemented. MVP rules-based recommendations remain independently usable. |
| L-01 | **Later stage 2** | As a student, I can use LinkedIn profile information to populate my matching profile. | **PRD:** AI matching and core product flow step 1. Decide whether this means a user-uploaded export, pasted information, or an authorized account connection. A live LinkedIn integration is not assumed. |
| L-02 | **Later stage 2** | As a student, I can import or connect calendar information instead of manually entering availability. | **PRD:** Core product flow step 1. Select calendar providers and distinguish an uploaded calendar from ongoing synchronization. Share availability rather than private event details (**Proposed**). |
| L-03 | **Later stage 2** | As a matched pair, we receive AI suggestions for mutually suitable times and a practice schedule. | **PRD:** AI scheduling core function. Builds on later-stage basic scheduling and availability inputs; define conflict and schedule-change rules. |
| L-04 | **Later stage 2** | As a student, I can arrange dedicated technical walkthroughs or course study sessions with a suitable partner. | **PRD:** Problem statement, solution summary, AI-assisted course guidance. Basic goals can appear in MVP profiles; dedicated session formats, teaching roles, and feedback rubrics are deferred pending scope confirmation. |
| L-05 | **Later stage 2** | As a student, I can give and receive peer ratings after practice. | **PRD:** Solution summary. Rating dimensions, eligibility, visibility, and handling disputed or abusive feedback are undefined. Peer ratings are distinct from AI performance assessments. |
| L-06 | **Later stage 2** | As a matched pair, we can communicate in an in-product partner chat. | **PRD:** Additional functionality. Limit the first version to matched partners; whether group chat is needed is unresolved. |
| L-07 | **Later stage 2** | As a pair or group, we can receive AI summaries, schedule suggestions, periodic feedback, practice plans, and reminders in our chat. | **PRD:** Additional functionality, partner-chat AI bot. Access to chat content and group participation need separate decisions. |
| L-08 | **Later stage 2** | As a student, I can record ongoing practice progress and receive practice reminders or daily check-ins. | **PRD:** Accountability in the solution summary; practice records, reminders, and tentative daily check-ins in additional functionality. Exact completion rules and reminder channels are undefined. |
| L-21 | **Later stage 2** | As a student, I can optionally upload a resume and ask AI to extract matching profile information. | **PRD:** AI matching and core product flow step 1. Propose skills, industries, and interests for student review and correction; preserve manual entry if extraction fails. Supported formats, limits, and upload retention remain open. Former MVP-03, deferred to protect this week's scope. |
| L-09 | **Later stage 3** | As a pair, we can earn a named flame icon for consistent practice. | **PRD:** Additional functionality. The proposed rule lights the flame after three consecutive practice days, grays it out after a break longer than two days, and requires another three-day streak to relight it. Define qualifying practice, day boundaries, and the effect of a one- or two-day gap before implementation. |
| L-10 | **Later stage 3** | As a student, I can view anonymous rankings based on partner practice activity. | **PRD:** Additional functionality. Choose whether rankings measure sessions or days, whether the ranked entity is a person or a pair, and how participation is verified. |
| L-11 | **Later stage 3** | As an eligible participant, I can earn physical rewards for weekly top-ten performance. | **PRD:** Additional functionality. Conditional on a reward budget, fulfillment owner, eligibility rules, and an agreed ranking measure. |
| L-12 | **Later stage 3 experiment** | As a student, I may be able to pay to restore an expired streak. | **PRD:** Tentative monetization idea. Validate demand and define its effect on streaks and rankings before adding purchases. |
| L-13 | **Later stage 3 experiment** | As a subscriber, I may receive additional monthly AI feedback or two-person analysis. | **PRD:** Tentative monetization idea. Free allowance, paid allowance, pricing, and the meaning of two-person analysis are undefined. Do not assume that the MVP is paid. |
| L-14 | **Later candidate** | As a student, I may be able to publish and respond to discussion posts. | **PRD:** Explicitly tentative and flagged as potential scope drift. Reconsider only if evidence shows it supports finding partners or practicing. |

## Proposed MVP evaluation

The MVP evaluates matching, not call quality, interview assessment, or improved hiring outcomes. The deadline is this week, but numeric targets, pilot size, and observation period remain unspecified. The following are proposed measurements, not established targets:

| Question | Suggested measurement |
| --- | --- |
| Can eligible students get started? | Number of invited, verified, and profile-complete students. |
| Can students find a suitable partner? | Percentage of students requesting a match who reach a mutually accepted partnership within an agreed period; median time to acceptance; unmatched requests. |
| Do students find the recommendations relevant? | Participant assessment of partner fit and reasons for acceptance, rejection, or requesting a replacement. |
| Can students coordinate after acceptance? | Percentage of mutually accepted pairs that reach the contact handoff; a lightweight follow-up can ask whether they connected. |
| Does matching work across the broader audience? | Unmatched requests and partner-fit feedback across represented schools and practice goals, interpreted in light of pilot size. |

**Proposed pilot:** Test verification, profile creation, recommendations, mutual acceptance, and contact handoff with a small cohort of USC students. Include more than one school if feasible; broad USC eligibility does not require a campus-wide launch this week. Observe abandoned steps and collect feedback from both partners. Actual practice completion can be asked about separately but is not required to demonstrate the matching MVP.

**Later evaluation:** When calls and AI feedback launch, assess call reliability, completed practice sessions, successful feedback generation, feedback usefulness, and repeat practice. Those are not launch gates for this week's release.

## Open questions and scope concerns

### Decisions affecting the MVP

1. **Delivery details:** What exact date and time is the MVP due, how many people are building it, and is the deliverable a functioning app or a prototype? The confirmed constraint is this week.
2. **Budget ceiling:** What amount can be spent on hosting and verification, and how many pilot users are expected? The confirmed direction is limited cost; no amount is assumed.
3. **Verification:** Is verifying a USC email sufficient for this pilot, or must current enrollment be established another way? The audience is already settled as all USC students.
4. **Matching intent:** Should students be paired at similar skill levels, complementary levels, or by a selectable preference? Which career, technical, and course categories are essential for the first pilot? Are partnerships persistent or per practice need?
5. **Coordination and visibility:** Which contact method can students share after mutual acceptance, and which profile fields may potential partners see? Is the proposed contact handoff sufficient for this week's pilot?
6. **Language:** Which profile and interface languages are required this week? Transcription and feedback languages can be decided with the later practice release.
7. **Success and pilot:** How many students will participate, how long can matching be observed, and what minimum outcomes define success? In a small cohort, strict matching criteria may leave many students unmatched.

### Decisions that can wait until later stages

8. For built-in calls, is audio alone sufficient initially, or is video also required? What concurrency and call duration should the next release support?
9. Should AI feedback arrive during or after the interview? Which assessment rubric, recording consent, feedback-sharing, retention, and deletion rules apply?
10. Does LinkedIn support mean uploaded material or a live account connection, and which calendars should be supported?
11. Are peer ratings private feedback, public reputation, or inputs to matching? How should inaccurate ratings be handled?
12. Is daily practice realistic for these students? Define streak rules around ordinary schedule gaps before tying them to rewards or purchases.
13. Who funds and fulfills physical rewards, and are rankings based on individuals or pairs, sessions or days?
14. What problem do paid streak restoration and subscriptions solve, and what evidence would justify building them?

**Scope assessment:** A rules-based matching release with no AI provider is the agreed focus for this week. AI-assisted recommendations, built-in calls, full-session capture, and AI interview feedback are deferred. Budget and capacity are still too uncertain to promise delivery feasibility. Test partner fit before adding integrations, gamification, or payments, and evaluate interview improvement separately from matching success.
