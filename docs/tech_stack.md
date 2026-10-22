**I recommend a fresh Next.js + TypeScript app, backed by Supabase Postgres and Supabase Auth.** Use the HTML as a reference for the user journey and visual design. Build the working application directly in your preferred stack.

This is a practical architecture for both this week’s matching demo and the subsequent product.

| Layer | Recommendation | Responsibility |
|---|---|---|
| Interface | Next.js App Router + React | Onboarding, profiles, recommendations, requests |
| Application backend | Next.js Server Actions and Route Handlers | Validation, matching logic, accepting requests, contact access |
| Persistent database | Supabase Postgres | Student profiles, availability, requests, accepted partnerships |
| Authentication | Supabase Auth | Login, email verification, sessions |
| Hosting | Vercel, using an appropriate plan | Deploy the Next.js application |

Next.js supports server-side mutations and API endpoints, while Supabase provides an official Next.js integration. This keeps the MVP in one application codebase plus one managed backend service. [Next.js backend documentation](https://nextjs.org/docs/app/guides/backend-for-frontend), [Supabase Next.js guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

**Why Supabase fits your persistence needs**

Your data naturally has relationships: students have profiles and availability, send requests to other students, and gain access to contact details after acceptance. I would use these initial tables:

| Table | Contents |
|---|---|
| `profiles` | Display name, school/program, practice goals, skills, level, recruiting information, active status |
| `availability` | Student, recurring time windows, timezone |
| `match_requests` | Sender, recipient, pending/accepted/declined/canceled status, timestamps |
| `private_contacts` | Contact information shared after acceptance |
| `match_feedback` | Optional partner-fit feedback for evaluating the MVP |

Use Supabase’s managed authentication records for identity. Keep verification status authoritative on the server rather than accepting a profile field that users can edit.

For the first version, I would use the Supabase client and SQL migrations directly. Add an ORM only if your team already has an established preference.

Access rules belong in both the application and database: students edit their own profiles, only request participants can change the relevant request state, and contact details become readable after acceptance. Supabase’s row-level security supports database-enforced access policies. [Supabase access policies](https://supabase.com/docs/guides/database/postgres/row-level-security)

**How I would implement matching**

Keep the process small and understandable:

1. Query eligible, active USC students, excluding the current user.
2. Filter or score compatibility using goals, skills, level, and availability.
3. Use AI to rerank a small eligible shortlist and explain fit.
4. Validate the AI output against that shortlist before displaying results.

This preserves actual eligibility and availability constraints while demonstrating AI-assisted matching. A vector database is unnecessary for the initial structured profiles.

Persist requests and acceptance independently of AI. The sender expresses interest by requesting; the recipient confirms the partnership by accepting. That transition should be an atomic database operation so repeated clicks cannot create inconsistent states.

**Next.js is suitable for the real product**

For the confirmed **iPhone Home Screen web app**, Next.js is a strong fit. It supports web-app manifests and an app-like mobile experience, so the demo can become the first version of the actual product. [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)

If you later require an installed native iOS application, you can retain Postgres, authentication, and backend business logic while adding a mobile client. Keep business logic in reusable server modules and expose explicit APIs when that client needs them. Next.js server features require a hosted runtime; they do not become device-side backend functionality through static export. [Next.js deployment constraints](https://nextjs.org/docs/app/guides/backend-for-frontend)

For later calling and interview analysis, I would add a managed calling service and background processing. Those additions can coexist with Next.js.

**Three practical considerations for this week**

- **Set up authentication email early.** Supabase’s default sender only delivers to project-team addresses. Real USC-student email verification requires custom SMTP. Verifying email ownership also does not establish current enrollment. [Supabase email setup](https://supabase.com/docs/guides/auth/auth-smtp)
- **Start with a small database plan.** Supabase Free currently includes a 500 MB database; inactive projects can pause. Pro starts at $25/month. Hosting, email, and AI usage are separate costs. [Supabase pricing](https://supabase.com/pricing)
- **Check deployment-plan suitability.** Vercel Hobby is restricted to personal, noncommercial use; choose the plan that fits your team’s deployment arrangement. [Vercel usage guidelines](https://vercel.com/docs/limits/fair-use-guidelines)

The most useful completion check is a two-account walkthrough: create profiles, obtain input-dependent recommendations, send a request, accept it from the other account, reveal contact information, and confirm everything survives reloads.