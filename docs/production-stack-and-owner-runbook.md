# Eatlyte Production Stack and Owner Runbook

This runbook maps the requested commercial stack to the current repository and the manual setup the owner must complete.

## Target stack

| Layer | Recommended tech | Repository status |
| --- | --- | --- |
| Mobile app | React Native + Expo + TypeScript | Planned as a separate `apps/mobile` workspace or separate repo. Current repo is the Next.js web/admin/PWA app. |
| Navigation | Expo Router | Planned for mobile app. |
| UI | NativeWind or Tamagui | Planned for mobile app; current web uses Next.js + Tailwind. |
| Backend | Supabase initially; NestJS + PostgreSQL later for larger scale | Supabase is already used for auth/database; NestJS is not needed until scale or domain complexity requires it. |
| Database | PostgreSQL / Supabase Postgres | Current SQL lives in `database/`; next phase should convert this into Supabase CLI migrations. |
| Auth | Supabase Auth with Google/Apple login | Google is implemented in web. Apple login must be added for iOS/mobile launch. |
| Storage | Supabase Storage | Health report bucket/policies still need production setup. |
| Food APIs | USDA FoodData Central, Open Food Facts, internal verified food DB | USDA/Open Food Facts/FatSecret routes exist or are documented; internal verified DB is a future product requirement. |
| AI/Nutrition engine | Node.js service first; Python later for advanced ML | Current AI is implemented through Next.js API routes. A separate Node service is optional after launch. |
| Payments | RevenueCat for Apple/Google subscriptions | Not implemented. Required before commercial mobile subscriptions. |
| Push notifications | Expo Notifications | Planned for mobile app. |
| Analytics | PostHog / Firebase Analytics | Not implemented. Must be privacy-safe and avoid sensitive health data. |
| Crash reporting | Sentry | Environment key exists; full Sentry SDK setup is pending. |
| CI/CD | GitHub Actions + Expo EAS Build/Submit | Web CI exists. EAS should be added when the Expo app exists. |
| Web admin panel | Next.js + Tailwind + Supabase | This repository currently fits that role. |

## Recommended repository structure

For fastest commercial progress, keep this repo as a monorepo:

```text
apps/
  web/       # current Next.js app, migrated later when convenient
  mobile/    # Expo Router mobile app
packages/
  core/      # shared nutrition score, targets, validation, safe guidance copy
  supabase/  # generated types and database helpers
supabase/
  migrations/
```

Do not migrate folders immediately unless there is time to test thoroughly. For now, keep improving the current Next.js app and add the Expo app in a controlled phase.

## Manual owner actions required now

### GitHub
1. Enable branch protection for `main`.
2. Require `Eatlyte CI / validate` before merge.
3. Enable Dependabot alerts, Dependabot security updates, secret scanning, and push protection.

### Vercel
1. Set production branch to `main`.
2. Confirm preview deployments are enabled for pull requests.
3. Add preferred Supabase browser env variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Keep server-only secrets private:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `RESEND_API_KEY`
   - `FATSECRET_CLIENT_SECRET`

### Supabase
This coding environment does not have direct Supabase dashboard access. To automate Supabase later, add secrets to GitHub Actions, not chat:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID_STAGING`
- `SUPABASE_PROJECT_ID_PRODUCTION`
- `SUPABASE_DB_PASSWORD_STAGING`
- `SUPABASE_DB_PASSWORD_PRODUCTION`

Before production database automation:
1. Create a staging Supabase project.
2. Convert `database/*.sql` files into ordered Supabase CLI migrations.
3. Test migrations on staging.
4. Back up production before applying any production migration.

### Apple/Google mobile launch
Before app-store submission:
1. Create Apple Developer and Google Play Console accounts.
2. Create App Store Connect and Play Console app records.
3. Configure RevenueCat products for subscriptions.
4. Add Apple login for iOS compliance if third-party login is available.
5. Prepare store privacy labels/data safety forms.
6. Prepare app screenshots, support URL, privacy URL, and review credentials.

## Production readiness priorities

1. Complete Supabase persistence for all health data; avoid LocalStorage for sensitive long-term health records.
2. Add explainable nutrition score from real logs.
3. Add account deletion and data export.
4. Add Sentry with privacy-safe filtering.
5. Add payment/subscription entitlements.
6. Add Expo mobile app and EAS build/submit workflows.
7. Add Supabase CLI migrations and staging/production promotion.
