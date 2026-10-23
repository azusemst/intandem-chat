# InTandem USC MVP

Next.js App Router application for USC practice partners: verified email login,
editable profiles and weekly availability, deterministic recommendations,
transactional requests, and contact handoff after mutual acceptance.

## Run locally

Requires Node.js 22+ and npm. The lockfile records the verified dependency versions.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. For immediate local testing, run `npm run dev`
without Supabase environment variables. Enter any valid `@usc.edu` address, such
as `alice@usc.edu`, and continue without an OTP. Create a second account such as
`bob@usc.edu` to test requests and contact handoff (use separate browser profiles
or sign out and switch addresses). No sample profiles are prefilled.

### Temporary development login

This temporary bypass checks only email syntax and the exact normalized `usc.edu`
domain; it does **not** verify email ownership or enrollment. Anyone can sign in
as any local test address. Use fictional information only. The UI labels this
mode explicitly. Sessions use random, HTTP-only cookies, expire after one day,
and are revoked on sign-out.

It is enabled only when `NODE_ENV=development`, no
`NEXT_PUBLIC_SUPABASE_URL` is set, and `DEV_EMAIL_LOGIN` is not `false`. If you
copied placeholder Supabase values into `.env.local`, remove those values to use
this mode. Set `DEV_EMAIL_LOGIN=false` to disable it. Production (`npm run build`
and `npm run start`) always uses verified Supabase OTP login.

A separate embedded PostgreSQL database in `.next/intandem-dev-db` stores local
accounts, profiles, requests and sessions. It runs the application migration and
ordinary-role RLS; simulated confirmation records exist only in this isolated
store. It never creates or confirms hosted Supabase accounts. Local data survives
reloads and development server restarts, but is disposable and may be lost when
Next.js build output is cleared. This does not validate hosted Auth/SMTP, cross-device
access, or real-student eligibility. Do not expose this local mode to students.

To remove the temporary mode later, remove its branches in the login actions,
server client, proxy and UI, plus `src/lib/dev-mode.ts` and
`src/lib/server/dev-database.ts`. Restore the PGlite external-package setting if
no longer needed. Supply Supabase connection values to test the real OTP path.

For a local Supabase service, install/start Docker and run:

```sh
npx supabase start
npx supabase migration up --local
```

Use the local API URL and publishable/anon client key reported by the CLI in
`.env.local`. Local test emails appear at http://localhost:54324. Configure the
email template to include the OTP as described below. Never use the service-role
key in the application. Docker is not installed in the implementation environment,
so this full local Auth stack was not started here.

## Configuration and hosted setup

| Variable | Where | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js environment | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Next.js environment | Public client key; all operations still require authenticated grants/RLS |
| `APP_ORIGIN` | Server environment | `http://localhost:3000` locally; exact HTTPS deployment origin in production |
| `USC_EMAIL_DOMAINS` | Server environment | Exact domain allowlist, default `usc.edu`; comma separated |

The database allowlist in `private.allowed_email_domains` must agree with the
server allowlist. Only an administrator can change it. There is no application
administrative credential. SMTP credentials belong in Supabase settings.

1. Create a Supabase project and establish team access. No paid plan is assumed.
   Apply `supabase/migrations/202610220001_matching.sql` through the CLI:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   These are setup instructions, not commands already executed against a hosted
   project. Keep the `private` schema out of exposed API schemas.
2. Enable email signups and email confirmation in Supabase Auth. Configure custom
   SMTP with a verified sender domain. In the Magic Link and Confirm Signup email
   templates, display `{{ .Token }}` so students can enter the emailed code. The
   app uses `signInWithOtp` and `verifyOtp` with email codes; it has no link callback.
   Use six-digit OTPs with a short expiry (local default: ten minutes).
3. Create a Vercel project using the Next.js framework preset. Set the four
   environment variables above for the intended environment. Deploy with a normal
   Next.js server build (`npm run build`), not a static export. An authorized
   operator can use the Vercel dashboard or `npx vercel` after project creation.
4. Set Supabase Auth Site URL to the exact HTTPS deployment origin and allow only
   the exact development/preview origins the team actually needs. Redeploy after
   environment changes. SMTP, DNS verification, spending decisions, account terms,
   and project creation have not been performed.
5. Run the live rehearsal below. Use Safari on an actual iPhone, then Share → Add
   to Home Screen. The manifest, PNG icons, standalone launch, safe-area padding,
   and mobile styles are implemented; they still require physical-device checks.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run db:types:local
```

For public-route/asset smoke checks, run the production server in one terminal and
the check in another:

```sh
npm run start
npm run test:http
```

`MVP_SMOKE_ORIGIN` optionally changes the smoke-test origin. The check makes only
unauthenticated requests. `npm run db:types:local` generates database row/RPC types
from the migrated embedded PostgreSQL catalog. With a local Supabase service,
`npm run db:types` instead uses the standard Supabase type generator.

The test suite uses real PostgreSQL via PGlite for migrations, grants, RLS, RPC
validation, profile transactions, duplicate protection, request transitions, and
contact access. Only the managed Auth schema is replaced by a minimal test shim.
Fixtures are visibly fictional, use reserved `.test` contact addresses, and exist
only in disposable test memory. They are never seeded into student matching.
Server-identity tests mock Auth responses to verify the application guard; they do
not verify Supabase token issuance or actual email delivery. PGlite uses a single
queued backend: reciprocal/repeated submission tests exercise the same transaction
and unique index, but true multiple-connection race testing remains a hosted/local
Supabase rehearsal item.

## Implementation handoff — October 22, 2026

Status: local implementation delivered; the deployed MVP acceptance journey is
**not complete**. No Supabase/Vercel project or verified sender is available.
The planning assumption is October 23, 2026 at 3:00 p.m. America/Los_Angeles; this is
not a confirmed presentation appointment. No spending or real student pilot has
been authorized by these assumptions.

Implemented:

- `/login`, `/onboarding`, `/profile`, `/matches`, `/requests`, `/settings`;
  OTP entry, sign-out, session verification and refresh, conditional career fields,
  Unicode names, free-text courses, editable IANA timezone and weekly windows.
- Atomic profile/topic/availability/contact saves; RLS and authenticated RPCs;
  confirmed exact-domain identity checked using managed Auth records, not profile
  metadata. Login emails never appear in shared profiles.
- Ranking signals weighted 30/25/20/10/15 for goals/topics, interests,
  industry/stage, level and availability. Goals/topics uses the mean of two Jaccard
  similarities; availability saturates at two hours in the next seven calendar
  days. Missing attributes contribute zero. ID ties are stable. Reasons are drawn
  from actual fields, never fit percentages. No AI credentials or calls exist.
- Timezone-aware availability with Temporal, clipped from now through the end of
  the seventh calendar day in the viewer's timezone. Overlapping windows are
  merged. Temporal's compatible DST rule chooses the earlier ambiguous instant
  and shifts nonexistent times forward; spring/fall behavior is tested.
- Pending/accepted/declined/canceled lifecycle, unordered pair uniqueness, repeated
  submission handling, recipient acceptance/decline, sender cancellation, either
  participant ending an accepted partnership, persisted dismissal/reset, and
  polling/focus refresh every 15 seconds for requests.
- Contact reads require a currently accepted pair. Cancellation revokes future
  database access immediately; open pages refresh periodically, and previously
  seen/copied details cannot be recalled. No user-data recommendation cache.
- Pause/resume and removal requests. Removal pauses matching and records a pending
  team task; it does not claim data is already erased. Existing request participants
  can still read the shared profile. End partnerships separately to revoke contact.
- Accessible labels, visible focus, responsive layouts, loading/error/empty states,
  manifest and generated app icons. No excluded features or prototype changes.

Verified locally:

- 47 automated tests pass (including the isolated development login flow), including direct database access by anonymous,
  unconfirmed, wrong-domain, owner, participant, unrelated, and banned identities;
  unauthorized writes, premature contact reads, atomic rollback, candidate
  eligibility changes, lifecycle/terminal states, and contact revocation.
- Lint, TypeScript, and production build pass. Catalog-based type generation passes.
- Desktop Chrome landing/login rendering and the requests-to-login redirect were
  inspected. Authenticated UI rendering awaits a connected service.
- HTTP smoke checks pass for landing/login, all five protected-route redirects,
  the standalone manifest and both PNG icons.
- `npm audit --omit=dev` reports zero production vulnerabilities. The full audit
  reported five high-severity development-only findings in the current
  `eslint-config-next` → `fast-glob` → `micromatch` → `braces` chain. The current
  compatible lint setup is retained; do not apply the suggested downgrade to
  Next.js 14. No development server should be exposed publicly.

Blocked on external setup:

- Hosted database migration, Auth/SMTP configuration, HTTPS Vercel deployment and
  a deployed URL; no service access or sender exists yet.
- Real email OTP login, logout/login persistence across devices, and the complete
  two-account request/acceptance/contact journey.

Unverified rehearsal checks:

1. Two consenting USC testers receive OTPs independently; create fresh career and
   study profiles, reload, sign out/in and verify persisted values.
2. Check recommendations against actual saved profiles, edit preferences, verify
   non-overlap disclosure, dismiss/replace, and exhaust an eligible pool.
3. Request from account A, accept from B, and verify both contact handoffs. Try
   decline, deliberate re-request, repeated/reciprocal simultaneous submissions,
   sender cancellation, and ending an accepted partnership.
4. Use a third ordinary account to attempt direct contact/request reads and writes;
   repeat checks with unconfirmed/wrong-domain identities. Verify contact is
   inaccessible immediately after cancellation, including direct database calls.
5. Pause/resume; submit removal; verify exclusion from new recommendations,
   retained requests, and honest pending status.
6. On an actual iPhone verify Home Screen launch, keyboard and scrolling, focus,
   long text, tap targets, text selection, empty/loading/error states, and retry.

The team still needs to choose real pilot size and service plans, supply consenting
testers/device, and ratify the provisional disclosure rules and a retention/removal
processing policy before real student use. The default exact `usc.edu` rule verifies
email access, not enrollment. The team must process pending deletion requests in
Supabase; an administrative deletion workflow is outside this student app.

Implementation references: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Next.js proxy](https://nextjs.org/docs/app/getting-started/proxy), and
[Temporal timezone behavior](https://tc39.es/proposal-temporal/docs/zoneddatetime.html).

The other files under `docs/`, the HTML prototype, and Git history were left
untouched. Local embedded PostgreSQL verification substitutes for the unavailable
service only for automated database checks, not live-service acceptance.
