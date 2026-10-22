# MVP Implementation Plan

## Execution contract

Build a working matching-first application for USC students. This document contains the product scope, technical decisions, task order, and completion checks needed for implementation. Reading the other product documents is not a prerequisite.

Execute this plan when the user requests implementation. Follow applicable `AGENTS.md` instructions and the user's current authorization; this plan does not override workspace rules. Preserve existing work, keep Git read-only unless instructed otherwise, and do not modify the prototype or unrelated documents. The HTML prototype is an optional visual reference, not reusable application code.

Work through the phases below. Complete independent local work while external setup is pending. Report completed, blocked, and unverified items separately; a simulated flow does not satisfy a live-service acceptance check.

## Navigation

- [Delivery target](#delivery-target)
- [Defaults and decisions](#defaults-and-decisions)
- [Architecture](#architecture)
- [Data and access rules](#data-and-access-rules)
- [Implementation phases](#implementation-phases)
- [Human setup dependencies](#human-setup-dependencies)
- [Verification and completion](#verification-and-completion)

## Delivery target

**Target:** This week's MVP demo, as requested October 22, 2026. Confirm the exact presentation time with the team; do not infer a date from this document when executing later.

**Platform:** A fresh Next.js and TypeScript application, deployed over HTTPS and usable from an iPhone Home Screen. Native iOS packaging is not required.

**Complete journey:** Verify USC email → enter profile and availability → review relevant partner recommendations → request a partner → partner accepts from another account → both see the agreed contact handoff. Profiles and requests persist across reloads and devices.

### Required scope

- All eligible USC students, across schools and programs.
- Manual profile creation and editing, including career and study goals.
- Manual availability with an explicit timezone.
- Actual AI-assisted partner recommendations with grounded fit explanations.
- Pending, accepted, declined, and canceled request states; decline and replacement options.
- Contact visibility controlled by mutual acceptance.
- Useful no-match, loading, validation, and service-error states.
- Profile visibility explanation, opt-out from matching, and a profile-removal request mechanism.

### Excluded scope

Calls, recording, transcription, AI interview assessment, resume parsing, LinkedIn/calendar connections, full session booking, chat, public ratings, streaks, rewards, subscriptions, and payments. Do not implement these to complete this demo.

## Defaults and decisions

These are provisional implementation defaults to make the plan executable, not previously confirmed product decisions. Keep them easy to change. Obtain team agreement on the verification and disclosure rules before a real student pilot; continue local implementation in the meantime.

| Topic | Implementation default |
| --- | --- |
| Eligibility | Require an authenticated, email-confirmed identity whose exact normalized email domain is `usc.edu`. Keep the allowlist server-controlled. Do not accept suffix lookalikes or a client-editable verification flag. Describe this as email verification, not proof of current enrollment. |
| Login | Supabase email OTP, with custom SMTP for hosted student use. Students enter their codes themselves. Implement sign-out and session expiry handling. |
| Practice purpose | Career interviews, technical practice, or course study. Career-only fields are conditional. |
| Matching intent | Shared practice topics and similar self-assessed levels, with availability overlap. Teaching strengths are optional; no compulsory one-for-one teaching exchange. |
| Partnership | Multiple recommendations and requests are allowed. One accepted request represents mutual interest; it does not create a booked practice session. |
| Shared profile | Display name, school/program, goals, topic levels, interests, relevant recruiting fields, and availability. Explain this before submitting the profile. |
| Contact handoff | Collect a contact email chosen by the student. Share it only with the other participant in an accepted partnership. Keep login email private unless the student explicitly selects it as their contact. |
| Language | English interface for the MVP; accept Unicode names and profile text. |
| Opt-out | Pause matching immediately; retain access to existing requests and accepted partnerships. |
| Removal | Record a deletion request, pause matching, and show an honest pending status. Team processing is required; do not imply that all data was erased. Agree retention and processing policy before the pilot. |
| Unselected infrastructure | AI provider/model, sender domain, service plans, spending ceiling, and exact deadline remain team dependencies. No paid tier is selected by this plan. |

## Architecture

- **Web and backend:** Next.js App Router, React, TypeScript. Use Server Actions for form mutations and Route Handlers where a public HTTP contract is useful. Share validation and business logic in server modules.
- **Identity and persistence:** Supabase Auth and Postgres; Supabase client, versioned SQL migrations, and generated database types. An additional ORM is not required.
- **Hosting:** Vercel with a plan appropriate for team access and usage.
- **Email:** An SMTP provider such as Resend, connected to Supabase Auth, using a verified sender domain.
- **AI:** One server-only adapter to the selected provider; structured input/output and bounded requests. No vector database is needed for the initial structured profiles.
- **UI:** Mobile-first forms, readable cards, clear navigation and explicit states. Rebuild the interface as React components. Keep presenter/debug controls out of the student flow.

### Suggested code boundaries

Use `src/app/` for pages and endpoints, `src/components/` for UI, `src/lib/validation/` for shared schemas, and `src/lib/server/` for auth, profiles, matching, requests, and AI access. Store SQL in `supabase/migrations/` and checks in `tests/`. Adapt these paths if an application already exists; avoid parallel scaffolds.

Use `/login`, `/onboarding`, `/profile`, `/matches`, `/requests`, and `/settings` as the initial routes. The requests page shows incoming and outgoing requests plus accepted partners and their authorized contact information.

### Configuration contract

Provide an `.env.example` with placeholders and instructions for:

- App origin and Supabase URL/publishable key.
- Server-controlled USC email-domain allowlist.
- Server-only AI provider, model, and API key.
- Any narrowly required server-only administrative credential; routine user operations should use the user's authenticated context.

Keep actual credentials out of source and logs. Do not put server secrets in public environment variables. Configure SMTP credentials in Supabase rather than exposing them to browsers. Document the exact variable names chosen during implementation.

## Data and access rules

Use UUID identities linked to managed Auth users. Add foreign keys, timestamps, validation constraints, and indexes for the actual queries.

| Record | Minimum contents |
| --- | --- |
| `profiles` | User ID, display name, school/program, purpose, goals, interests, conditional target industry/recruiting stage, active flag, completion state, version/update timestamp |
| `profile_topics` | User ID, normalized topic key, purpose such as practice or optional help offered, beginner/intermediate/advanced level where relevant |
| `availability` | User ID, timezone, weekly day and start/end local times |
| `private_contacts` | User ID and student-approved contact email |
| `match_requests` | Request ID, sender, recipient, status, created/updated timestamps |
| `deletion_requests` | User ID, request time, pending/processed state |

Optional partner-fit feedback can be added only after the required journey works. Do not build public ratings.

### Enforcement

- Enable row-level security and intentional role grants on exposed tables. Check authentication, confirmed email domain, ownership, and participant role in backend operations and relevant database policies/functions.
- Unauthenticated or ineligible accounts cannot browse candidate profiles or create requests. Incomplete or paused profiles do not appear as new recommendations.
- A student can update only their own profile, topics, availability, and contact. They cannot alter Auth verification or another participant's request identity.
- Participants can read their own requests; unrelated users cannot. The recipient alone accepts or declines a pending request; the sender can cancel it. Either participant can end an accepted partnership by canceling it, immediately revoking contact access.
- Declined/canceled requests are terminal. A deliberate replacement or new request must follow duplicate prevention rules; do not silently reactivate a request.
- Allow at most one pending or accepted request per unordered student pair. Handle simultaneous reciprocal requests and repeated submissions transactionally; show the existing request rather than creating duplicates.
- Accept only a still-pending request for eligible participants. Enforce state transitions in the database with expected-current-state checks, not only UI conditions.
- Contact access is owner-only or for the other member of a currently accepted pair. Omit private contacts and login emails from candidate responses, AI payloads, and unauthorized cached responses.
- Profile/availability changes invalidate recommendations. Recheck candidate eligibility and current profile state when creating requests, regardless of displayed recommendation age.

## Implementation phases

### Phase 0 Inspect and establish the project

- [ ] Read applicable workspace instructions and inspect existing files, package tooling, and user changes. Confirm the authorized implementation scope.
- [ ] If no app exists, scaffold a fresh Next.js App Router application with TypeScript. Reuse an existing package manager or choose npm if none exists. Do not initialize Git.
- [ ] Add only required dependencies; expose `dev`, `build`, `lint`, `typecheck`, and `test` scripts with commands that actually work in the chosen setup.
- [ ] Add configuration placeholders and concise local setup instructions in the implementation handoff.

**Exit:** The app runs locally and its initial build passes without secrets embedded in source.

### Phase 1 Authentication and database

- [ ] Write migrations for the records and access rules above; generate types.
- [ ] Implement email OTP login, confirmation, logout, and protected routes using the current Supabase Next.js session pattern.
- [ ] Validate identity server-side on protected reads and mutations; a page redirect alone is insufficient.
- [ ] Add fixtures for local automated tests. Keep fictional profiles visibly identified and isolated from real student matching.
- [ ] Apply migrations to the authorized local/demo database and test using ordinary user credentials, not only administrator access.

**Exit:** Two separate eligible accounts can authenticate and unauthorized database operations are rejected. Hosted email delivery may remain blocked on human setup, but must be reported as unverified.

### Phase 2 Profiles and availability

- [ ] Implement fresh onboarding and an editable profile summary. Do not prefill a new student's answers with demo data.
- [ ] Require display name, school/program, purpose, at least one practice topic and level, contact choice, and at least one availability window. Provide an “Other USC school/program” choice and free-text course topics.
- [ ] Support conditional career fields and optional interests/help offered. Use normalized topic keys for matching while preserving readable labels.
- [ ] Save profile changes with associated topics and availability consistently. Handle validation failures and preserve unsaved input on recoverable errors.
- [ ] Use IANA timezones, defaulting to `America/Los_Angeles` with an editable choice. Split overnight windows or reject them with clear guidance.
- [ ] Add matching pause/resume, privacy explanation, and deletion-request submission in settings.

**Exit:** Saved values survive reload and a second login; study-only students can finish without recruiting answers; pause/removal requests exclude the profile from new matching.

### Phase 3 Actual partner recommendations

- [ ] Build a pure candidate-filtering/scoring module with explicit inputs, stable tie-breaking, and focused tests.
- [ ] Exclude self, ineligible/inactive/incomplete profiles, and existing pending/accepted pairs. Require a shared practice topic and actual overlapping availability for the provisional matching default.
- [ ] Compare availability over the next seven calendar days using each student's timezone and a timezone-aware library; avoid hand-written UTC offsets and account for daylight-saving transitions.
- [ ] Rank eligible candidates using topic overlap, similar level, relevant goal/industry/stage alignment, interests, and overlap duration. Keep weights in one configuration module.
- [ ] Send at most ten eligible candidates to the AI adapter, using pseudonymous candidate IDs and matching fields only. Ask for up to three ranked IDs and short evidence-based explanations. Treat profile text as data, not instructions.
- [ ] Validate returned IDs, uniqueness, output length, and explanation evidence. Never let AI introduce an ineligible candidate or unsupported availability claim. Use a finite timeout, bound retries, and limit calls per user using a shared server/database mechanism.
- [ ] Display no-match and service-error states separately. On provider failure, a labeled rules-based fallback is acceptable; it must not claim to be AI output. Do not use ungrounded percentage-match scores.
- [ ] Cache only with appropriate user/profile-version scoping; skip caching initially if correct invalidation would add complexity.

**Exit:** Profile edits materially affect controlled test cases, no-match is real, and at least one deployed recommendation has used the configured AI provider successfully. Mock adapters support tests but cannot satisfy that last check.

### Phase 4 Requests and contact handoff

- [ ] Implement request creation, incoming/outgoing lists, recipient accept/decline, sender cancellation, and ending an accepted partnership.
- [ ] Use the transactional state rules above; refresh both views through ordinary refetching or polling. Realtime subscriptions are optional.
- [ ] Support dismissing a recommendation and obtaining another eligible candidate without editing the profile. A dismissed recommendation is distinct from a declined incoming request.
- [ ] Show pending confirmation only after persistence succeeds. Reveal contact details only after accepted-state authorization succeeds.
- [ ] Add clear duplicate, stale-state, ineligible-candidate, and network-error handling.

**Exit:** Two real accounts complete request → acceptance → contact handoff; a third account remains unable to access private requests or contacts.

### Phase 5 Mobile deployment and rehearsal

- [ ] Add app name, icons, manifest, and responsive layout for iPhone Home Screen launch. Handle safe areas, keyboard visibility, and scrollable content without fake device chrome.
- [ ] Use accessible form labels, visible focus, appropriate selection semantics, and reachable tap targets. Check empty, loading, and long-text states.
- [ ] Complete a normal Next.js server deployment; do not static-export server functionality.
- [ ] Set environment variables and exact auth origins/redirect URLs for the deployed environment. Confirm migrations, SMTP, and AI connectivity.
- [ ] Run the completion checks below and record results. Provide the deployed URL and exact local run/test commands in the handoff.

**Exit:** The actual iPhone demonstration passes; any device checks not performed are explicitly listed as unverified.

## Human setup dependencies

Ask for missing setup information early and continue tasks that do not depend on it. Use secure credential configuration, not secrets pasted into the plan.

| Dependency | Human action | What it blocks |
| --- | --- | --- |
| Deadline and operating budget | Confirm presentation time, pilot size, service plans, billing owner, and deployment seats | Delivery scheduling and paid service choices |
| Account access | Establish Supabase/Vercel accounts and grant suitable access | Hosted database/deployment setup |
| Sender domain and email | Provide DNS control, verify the sender, configure SMTP, receive student verification codes | Hosted login for actual students |
| Verification/disclosure policy | Accept or revise provisional eligibility, profile-sharing, contact, and removal rules | Real student pilot |
| AI provider/model | Select the provider/model, configure credentials and usage budget | Live AI matching acceptance |
| Pilot participants and iPhone | Supply two consenting eligible testers, compatible profiles, and demo device | Real cross-account and device validation |

Use the existing cost assumptions only for planning: free service tiers where suitable, or approximately $20/month for basic Vercel Pro plus $25/month for basic Supabase Pro, with email/domain/AI and additional usage separate. These are not spending authorization. Confirm current terms and prices when provisioning; no pricing research is required to implement the local app.

## Verification and completion

### Automated checks

Run the configured lint, TypeScript, focused tests, and production build. Tests must exercise behavior rather than duplicate implementation details:

- Candidate exclusion, changed inputs, no matches, timezone overlap and daylight-saving cases.
- Malformed AI output, invented IDs, duplicate IDs, timeout, and truthful fallback labeling.
- Access attempts by unauthenticated, unconfirmed, wrong-domain, owner, participant, and unrelated accounts, including direct database/API calls.
- Unauthorized profile/contact writes and premature contact reads.
- Request lifecycle, duplicate/reversed simultaneous requests, repeated acceptance, and contact revocation after cancellation.
- Persistence and profile/availability consistency after updates.

### Live demo checks

- [ ] Two eligible USC students receive verification emails and log in independently.
- [ ] Fresh career and study profiles save correctly; values survive reload/logout/login.
- [ ] Recommendations use actual profile data and include a successful live AI response.
- [ ] Incompatible availability produces a no-match result with an edit/retry path.
- [ ] A student requests, another accepts, and both see the accepted state and contact handoff.
- [ ] Decline, replacement, cancellation, and retry behave as described.
- [ ] A third account cannot obtain private contact details or alter another pair's request.
- [ ] Pause and deletion-request settings work and explain their effects honestly.
- [ ] Home Screen launch, keyboard, scrolling, text selection, and error recovery work on the actual iPhone.
- [ ] No deferred features are advertised as working; seeded data and simulations are clearly identified.

### Completion report

State what was implemented, where it runs, commands/checks executed, live-service and device results, remaining external dependencies, and any deviations from this plan. Include setup steps still needed from the team. Mark the MVP complete only when the required deployed journey passes; local success alone is not deployed-demo completion.
