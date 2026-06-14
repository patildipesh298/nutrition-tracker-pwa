# Phase 1 — GitHub Branch and Release Workflow

This document defines the production-grade branch, release, and manual owner setup workflow for Eatlyte.

## Branch model

### `main`
`main` is the production branch. Vercel production deployments should be connected to `main` only.

Rules:
- No direct pushes after branch protection is enabled.
- All changes merge through pull requests.
- Required checks must pass before merge.
- Squash merge is recommended for clean history.
- Use release tags for production milestones, for example `v1.0.0`.

### Feature branches
Use short-lived branches:
- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `release/<version>`

Examples:
- `feature/nutrition-score-engine`
- `fix/supabase-profile-rls`
- `release/v1.0.0`

## Required pull request checks
Every pull request into `main` must pass:
- `npm ci --no-audit --no-fund --prefer-offline`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

The GitHub Actions workflow in `.github/workflows/ci.yml` enforces these commands.

## Required PR content
Every PR must include:
- Summary of changes.
- Files changed.
- Test results.
- Database changes, if any.
- Environment variable changes, if any.
- Screenshots or preview URL if UI changed.
- Manual owner steps, if any.
- Health/safety impact for nutrition, AI, family, or wellness changes.

## Release flow
1. Create a feature branch from latest `main`.
2. Commit focused changes.
3. Open a pull request into `main`.
4. Confirm GitHub Actions pass.
5. Review Vercel preview deployment.
6. Confirm Supabase migrations are safe and tested on staging if database changes exist.
7. Squash merge to `main`.
8. Vercel deploys production from `main`.
9. Create a release tag for major production milestones.

## Manual GitHub owner steps
The app owner must configure these settings in GitHub because repository settings cannot be fully enforced by files in this repo.

### Enable branch protection for `main`
Go to:
`GitHub repository → Settings → Branches → Branch protection rules → Add rule`

Set:
- Branch name pattern: `main`
- Require a pull request before merging: enabled
- Require approvals: at least `1` if collaborators are available
- Dismiss stale pull request approvals when new commits are pushed: enabled
- Require status checks to pass before merging: enabled
- Required status check: `Eatlyte CI / validate`
- Require branches to be up to date before merging: enabled
- Require conversation resolution before merging: enabled
- Require linear history: recommended
- Do not allow force pushes: enabled
- Do not allow deletions: enabled

### Enable repository security features
Go to:
`GitHub repository → Settings → Code security and analysis`

Enable where available:
- Dependency graph.
- Dependabot alerts.
- Dependabot security updates.
- Secret scanning.
- Push protection for secrets.
- CodeQL/code scanning if available for the plan.

### Configure Vercel production branch
Go to:
`Vercel Project → Settings → Git`

Set:
- Production Branch: `main`
- Preview deployments: enabled for pull requests
- Auto-deploy production from `main`: enabled only after CI/branch protection is active

## Manual Supabase access answer
This coding environment does not automatically have direct access to your Supabase dashboard or database unless you provide a configured Supabase CLI session, project reference, access token, and database password through secure environment secrets.

Do not paste service-role keys or database passwords into chat. Configure them as GitHub Actions secrets or local environment variables.

For direct automation later, add these GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID_STAGING`
- `SUPABASE_PROJECT_ID_PRODUCTION`
- `SUPABASE_DB_PASSWORD_STAGING`
- `SUPABASE_DB_PASSWORD_PRODUCTION`

Recommended Supabase manual setup now:
1. Create a staging Supabase project separate from production.
2. Keep production database backups enabled.
3. Apply schema changes to staging first.
4. Promote to production only after the Vercel preview and CI pass.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only in Vercel/GitHub secrets.

## Current Vercel environment variable alignment
The app supports both public and server-side Supabase variable names in code paths, but the preferred production names are:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If Vercel currently uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`, keep them temporarily only if the app still needs backward compatibility, but add the `NEXT_PUBLIC_` versions for browser Supabase auth.

Required commercial variables to verify in Vercel:
- `NEXT_PUBLIC_SITE_URL=https://eatlyte.app`
- `NEXT_PUBLIC_APP_URL=https://eatlyte.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_VISION_MODEL`
- `DEEPSEEK_API_KEY`
- `USDA_API_KEY`
- `FATSECRET_CLIENT_ID`
- `FATSECRET_CLIENT_SECRET`
- `EMAIL_PROVIDER`
- `RESEND_API_KEY` or `SENDGRID_API_KEY`
- `INVITE_FROM_EMAIL`
- `SENTRY_DSN` when monitoring is enabled

## Definition of done for Phase 1
Phase 1 is complete when:
- CI workflow exists and passes.
- PR template exists.
- Branch protection is manually enabled on `main`.
- Vercel production branch is confirmed as `main`.
- Repository security features are enabled.
- Required Vercel env variables are confirmed.
- Supabase access/migration ownership is documented.
