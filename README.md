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

### Test email verification locally (no paid plan or SMTP account)

Use the local Supabase Auth service and its captured-email inbox. This exercises
code issuance, confirmation, sessions and database access without delivering
anything to a real USC inbox. It does not test real email ownership, SMTP
reliability or USC's link-scanning behavior. Local template customization is
independent of the hosted free-plan restriction.

#### Prepare the local email templates

Install and start Docker Desktop (or a compatible Docker runtime). Run all
commands below from this repository's root. The Supabase CLI is already a project
dev dependency; no Supabase account, cloud project, `supabase login`, or project
link is required for this local workflow. Do not run `supabase init` over the
existing configuration.

Create `supabase/templates/otp.html` with:

```html
<h2>Your InTandem verification code</h2>
<p>{{ .Token }}</p>
<p>Enter this code on the InTandem login page.</p>
```

Append these sections to `supabase/config.toml` (or edit them if already present):

```toml
[auth.email.template.confirmation]
subject = "Your InTandem verification code"
content_path = "./supabase/templates/otp.html"

[auth.email.template.magic_link]
subject = "Your InTandem sign-in code"
content_path = "./supabase/templates/otp.html"
```

Both templates are needed: the first for a new account and the second for later
sign-ins. The existing `[auth.email]` configuration already enables confirmations,
six-digit codes and a ten-minute expiry. Keep those settings enabled. Local
customization uses files, not the hosted dashboard's template editor.
See [Supabase local email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates).

#### Start Supabase and connect the app

```sh
npx supabase start
npx supabase migration up --local
npx supabase status
```

If Supabase was already running when you changed the templates, restart it with
`npx supabase stop` followed by `npx supabase start`. Normal stop/start preserves
local data; no database reset is needed.

In your existing `.env.local`, replace the hosted connection values with these
local values; preserve a private copy of hosted settings if you need to switch
back later. Use the **local publishable key** shown by `supabase status` (or its
local **anon** key if that is what your CLI reports). Never use the secret or
service-role key.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PASTE_LOCAL_PUBLISHABLE_OR_ANON_KEY_HERE
APP_ORIGIN=http://localhost:3000
USC_EMAIL_DOMAINS=usc.edu
DEV_EMAIL_LOGIN=false
```

Restart Next.js after changing the environment:

```sh
npm run dev
```

#### Complete the verification flow

1. Open http://localhost:3000/login and enter a fictional test address such as
   `alice@usc.edu`. The button should say **Email me a code**. If it says
   **Continue with USC email**, you are still using the development bypass.
2. Open http://localhost:54324, the local email inbox (Mailpit; older CLI versions
   may label it Inbucket). Find the newest message for that address and copy the
   numeric code. Nothing is sent to the actual address.
3. Enter the code in the app and choose **Verify and continue**. Finish onboarding,
   save, reload, and test sign-out/sign-in with a newly issued code. Use a second
   browser profile with `bob@usc.edu` to test requests and acceptance independently.

To test failures, try an incorrect code or reuse a successfully consumed code;
verification should fail. Request a fresh code to continue. If the inbox is empty,
check that the app URL points to `127.0.0.1:54321`, not your hosted project, and
that `npx supabase status` reports the local services running. If emails still
contain links, check both template sections and restart Supabase.
See [Supabase's local email capture documentation](https://supabase.com/docs/guides/local-development/cli/testing-and-linting).

These accounts and profiles belong to the local Supabase database, separate from
both the temporary PGlite bypass store and your hosted database. To return to
hosted verification, restore the hosted URL/key and restart Next.js. To return to
the bypass, unset the Supabase connection variables and unset `DEV_EMAIL_LOGIN`
or set it to `true`, then restart Next.js.

The full Docker/Auth workflow has not been executed in the implementation
environment; the steps above are based on the project configuration and Supabase's
local-development documentation.

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

## Deploy to Vercel

Your Vercel account is enough to publish the website. To log in and use profiles
on the deployed site, you also need the hosted Supabase database and email setup
described above. **The temporary `@usc.edu`-only login works locally under
`npm run dev`; it is disabled on both Vercel Production and Preview deployments.**
The local test database and its accounts are not uploaded or migrated to Supabase.
Without Supabase configuration, the deployed landing page works but login is
unavailable. Setting `DEV_EMAIL_LOGIN=true` on Vercel will not enable the bypass.

### 1. Prepare Supabase

Create the project, apply the migration, and configure email OTP using the
commands in **Configuration and hosted setup** above. Copy the project URL and
publishable key from Supabase project settings. Do not copy the database password
or service-role/secret key into the app's environment variables.

For email delivery to ordinary USC testers, configure custom SMTP. Supabase's
built-in sender restricts delivery to authorized organization team addresses and
is not a general-purpose student email sender. Configure the Magic Link and
Confirm Signup templates to show `{{ .Token }}` so students receive a code they
can type into this app. See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp)
and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

### 2. Create the Vercel project

If this code is already in a supported Git provider such as GitHub, open your
Vercel dashboard, choose **Add New → Project**, and import the repository. Use
these settings:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`./`), where `package.json` lives |
| Framework Preset | Next.js |
| Install Command | `npm ci` (include development dependencies for the build) |
| Build Command | `npm run build` |
| Output Directory | Leave the Next.js default; do not set `out` |

You do not need `vercel.json`, a static export, or a custom start command. Vercel
runs the Next.js server functionality. Git-connected deployments can publish
subsequent changes when you push to the configured production branch.
See [Vercel Git deployments](https://vercel.com/docs/git).

Alternatively, deploy the local working directory without a Git provider. From
this repository's root, run:

```sh
npx vercel@latest login
npx vercel@latest link
```

Select your account/team, create a new project (or select the intended existing
one), and use this directory as its root. Then open that project's Vercel dashboard
to configure the environment below before running the production deploy command.
These commands link a Vercel project; they do not create a Git repository or commit
your code. See [Vercel CLI deployment](https://vercel.com/docs/projects/deploy-from-cli).

### 3. Add production environment variables

In Vercel **Project → Settings → Environment Variables**, add these values to the
**Production** environment:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your real Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | That project's publishable client key |
| `USC_EMAIL_DOMAINS` | `usc.edu` |
| `APP_ORIGIN` | Your stable production origin, e.g. `https://YOUR_PROJECT.vercel.app`, without a trailing slash |

Use the domain assigned to your project, not the example literally. If you do not
know it until the first deployment, update `APP_ORIGIN` after Vercel displays the
production domain and redeploy. Do not manually set `NODE_ENV` to `development`.
Keep SMTP credentials in Supabase's SMTP settings.

For Preview deployments, configure their **Preview** environment separately if you
want login to work there; a separate Supabase test project avoids mixing test and
production records. `.env.local` on your laptop does not configure Vercel.
Environment changes require a new deployment, including changes to public keys
that Next.js embeds at build time. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

### 4. Deploy and finish the auth URL settings

For a Git import, click **Deploy**. For a CLI-linked project, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx vercel@latest --prod
```

Save the stable production URL Vercel displays. In Supabase **Authentication →
URL Configuration**, set **Site URL** to that same HTTPS origin. Add only specific
additional redirect URLs you need for local/preview testing. This app uses typed
OTP codes and has no `/auth/callback` endpoint to configure. If the actual domain
differs from `APP_ORIGIN`, correct the variable and deploy again. For later CLI
updates, rerun `npx vercel@latest --prod` from this directory.

### 5. Verify the deployed app

Open `/login` on the production URL. It should offer **Email me a code**, not the
local development login. Sign in with an actual USC inbox, create a profile, and
check it survives reload and sign-out/sign-in. Use a second consenting tester to
check request → acceptance → contact handoff. Local test accounts do not carry over.

If login says the service is not configured, check the Production variables and
redeploy. If a code cannot be sent, check Supabase Auth logs, SMTP sender
verification, and sending limits. If profile saving fails, confirm the migration
was applied to the same Supabase project named in the Vercel variables. For build
or server failures, inspect the deployment's build/runtime logs in Vercel.

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
