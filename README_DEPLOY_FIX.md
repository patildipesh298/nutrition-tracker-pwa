# Eatlyte Robust Fix

This build fixes:

1. Supabase config detection
   - Supports your existing Vercel env names: SUPABASE_URL and SUPABASE_ANON_KEY.
   - Also supports NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY if added later.

2. Login page navigation
   - Hides authenticated app tabs on public pages / and /login.
   - Bottom mobile tabs are hidden on login.
   - Floating + button remains hidden on login/profile and appears in app screens.

3. Build stability
   - TypeScript check passes with `npx tsc --noEmit`.
   - Keeps Vercel install command as `npm install --no-audit --no-fund` to avoid the previous package-lock/npm ci failures.

Recommended Vercel settings:
- Install Command: npm install --no-audit --no-fund
- Build Command: npm run build
- Node.js: 20.x
- Redeploy with build cache OFF once.
