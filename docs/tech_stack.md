# Technical Stack

Build a fresh **Next.js + TypeScript** application with **Supabase Postgres and Auth**, deployed on **Vercel**. Deliver a working iPhone Home Screen web app this week. Use the HTML prototype as a design reference.

**Demo outcome:** Two verified USC students can create profiles, receive relevant recommendations, request and accept a match, and exchange contact information. Data survives reloads and is shared across accounts.

## Navigation

- [Scope and architecture](#scope-and-architecture)
- [Build sequence](#build-sequence)
- [Human tasks](#human-tasks)
- [Services and budget](#services-and-budget)
- [Demo acceptance checklist](#demo-acceptance-checklist)
- [After the MVP](#after-the-mvp)

## Scope and architecture

| Component | Choice | Responsibility |
| --- | --- | --- |
| Interface | Next.js App Router and React | Onboarding, profile editing, recommendations, requests |
| Backend | Next.js Server Actions and Route Handlers | Validation, matching, request transitions, contact access |
| Database and identity | Supabase Postgres and Auth | Persistent records, login, verification, access policies |
| Hosting | Vercel | Next.js deployment and HTTPS |
| Authentication email | SMTP provider such as Resend | Verification codes or magic links |
| Partner recommendations | Deterministic server-side scoring | Rank by interests, goals, industries, skills, and availability; show factual reasons |

Use the Supabase client and SQL migrations initially. Keep business logic in reusable server modules. [Next.js backend guide](https://nextjs.org/docs/app/guides/backend-for-frontend), [Supabase integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).

**This week:** Manual profiles and availability, rules-based recommendations, request states, contact handoff, and mobile presentation.

**MVP dependency boundary:** No AI provider, model, API key, SDK, or AI usage budget is required.

**Later:** AI-assisted recommendations, calls, recording, interview feedback, calendar and resume integrations, chat, rewards, and payments.

## Build sequence

Phases are ordered by dependency; effort and exact dates remain to be assigned.

| Phase | Implementation tasks | Exit condition |
| --- | --- | --- |
| **1 Establish access** | Create the Next.js app and hosted projects. Configure authentication, sender domain, SMTP, and deployment URLs. Agree the USC verification rule. | Two eligible students can receive verification email and log in on the deployed site. |
| **2 Persist profiles** | Add tables and migrations. Build manual profile and availability forms. Enforce ownership and visibility rules in the backend and database. | Each student can save and edit their own profile; changes survive reloads. |
| **3 Implement matching** | Filter active, eligible students and exclude self/existing pairs. Rank by interests, goals, industries, skills, level, and availability using deterministic rules. Treat these as ranking signals, not mandatory overlaps; show factual reasons and handle errors or no candidates. | Recommendations respond to profile changes and remain within the eligible pool. |
| **4 Complete requests** | Implement pending, accepted, declined, and canceled states. Make acceptance atomic and protect against duplicate transitions. Reveal contact details after acceptance. | A request sent from one account is accepted from the other, and both see the same outcome. |
| **5 Prepare the demo** | Add manifest and icons, responsive layout, safe-area handling, and usable keyboard/scroll behavior. Recruit pilot participants and rehearse. | The full acceptance checklist passes on the actual iPhone. |

### Initial database tables

| Table | Contents |
| --- | --- |
| `profiles` | Display name, school/program, goals, interests, skills, level, recruiting information, active status |
| `availability` | Student, time windows, timezone |
| `match_requests` | Sender, recipient, status, timestamps |
| `private_contacts` | Contact information available after acceptance |
| `match_feedback` | Optional partner-fit feedback for evaluation |

Use managed Auth records for identity and server-authoritative verification. Apply row-level access policies: students edit their own profiles, request actions depend on participant role, and contacts require an accepted partnership. Use factual reason templates; do not generate descriptions through an AI service. [Supabase access policies](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Human tasks

Account ownership, product decisions, real inboxes, and device interaction need team participation. Configuration can be automated once access is available.

- [ ] **Team lead — before phase 1:** Confirm deadline, pilot size, spending ceiling, service plans, and billing owner.
- [ ] **Account owners — phase 1:** Sign in or create service accounts, complete required terms/billing steps, and provide appropriate team access.
- [ ] **Domain owner — phase 1:** Provide a sender domain and DNS access, or publish the required verification records. USC email access does not grant USC DNS control.
- [ ] **Product lead — before phases 1 and 3:** Decide whether USC email verification is sufficient, which domains qualify, similar versus complementary matching, optional teaching strengths, and contact-sharing rules.
- [ ] **Two pilot students — phases 1 and 4:** Test email delivery and login, then send and accept a real request from separate accounts.
- [ ] **Demo coordinator — phase 5:** Recruit compatible participants; clearly identify fictional profiles if used.
- [ ] **Presenter — phase 5:** Add the app to the iPhone Home Screen and rehearse the complete flow on the demo device.
- [ ] **Billing owners — before and after demo:** Review usage, alerts, subscriptions, and whether the pilot and its data should continue.

**Early dependency:** Configure email first. Supabase's default sender only delivers to project-team addresses; student login requires a suitable custom SMTP setup. Email ownership alone does not prove current enrollment. [SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).

## Services and budget

Prices checked **October 22, 2026**, in USD before taxes. Estimates assume a small pilot and exclude labor, overages, and future media features.

| Service | Free option | Paid option or variable cost |
| --- | --- | --- |
| Vercel | Hobby, subject to personal/noncommercial eligibility | Pro: **$20/month**, one deploying seat included; **$20/month per additional deploying seat**. Viewers are free. [Billing](https://vercel.com/docs/plans/pro-plan), [eligibility](https://vercel.com/docs/limits/fair-use-guidelines). |
| Supabase | **$0/month**, 500 MB database; may pause after one inactive week | Pro: **from $25/month** for the basic first-project configuration. [Pricing](https://supabase.com/pricing). |
| Resend SMTP | **$0/month**, 3,000 emails/month, 100/day | Pro: **$20/month**, 50,000 emails/month; overages extra. [Pricing](https://resend.com/pricing). |
| Sender domain | No incremental fee if a suitable domain is already controlled | Annual registration cost depends on the chosen domain. Resend requires domain verification. [Requirements](https://resend.com/docs/dashboard/domains/introduction). |

### First month scenarios

Assume one deploying seat, an existing sender domain, Resend Free, usage within included quotas, and no AI service.

| Configuration | Estimated total |
| --- | --- |
| Eligible Vercel Hobby + Supabase Free | **$0** |
| Vercel Pro + Supabase Free | **$20** |
| Vercel Pro + Supabase Pro | **$45** |

Add domain registration, additional seats, email upgrades, taxes, and overages as applicable. Set provider alerts and application request limits. AI provider selection and usage costs belong to a later stage.

## Demo acceptance checklist

- [ ] Two eligible USC accounts receive verification emails and log in.
- [ ] Profiles and availability persist after reload and across sessions.
- [ ] Profile changes affect deterministic recommendations; factual reasons reflect actual compatibility. The full flow works without AI configuration.
- [ ] No eligible candidates produces a useful no-match outcome; lack of availability overlap is disclosed rather than automatically excluding a candidate.
- [ ] Requests support pending, accepted, declined, and canceled outcomes across accounts.
- [ ] Contact details remain hidden until acceptance; unrelated users cannot access them.
- [ ] Students can leave the matching pool and request profile removal.
- [ ] The Home Screen flow works with the iPhone keyboard, scrolling, and connectivity changes.
- [ ] Hosted services are available and usage is within the agreed budget before presentation.

## After the MVP

Continue with Next.js for the web product. Add AI-assisted ranking, managed calling, and background interview analysis in later stages, with provider and cost decisions made then. A future native client can reuse the database, authentication, and backend APIs; Next.js server features still need hosted infrastructure. [PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [deployment constraints](https://nextjs.org/docs/app/guides/backend-for-frontend).
