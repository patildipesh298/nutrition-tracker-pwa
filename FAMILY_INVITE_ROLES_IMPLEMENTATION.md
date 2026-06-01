# Eatlyte Family Invite, Caregiver, Elder and Professional Sharing Implementation

This build implements the complete user flow after an invite is sent.

## What happens after sending an invite

1. The owner chooses a role: Family Member, Caregiver, Elder / Managed Member, Doctor Viewer, or Dietitian Viewer.
2. Eatlyte sends an email with a 7-day invite link:
   `/accept-invite?token=...&role=...`
3. The recipient opens the link and sees a role-specific acceptance screen.
4. If they are not logged in, they are sent to login/signup and then returned to the invite.
5. After accepting:
   - Family Member goes to Home and tracks their own nutrition.
   - Caregiver goes to Family Wellness to help managed profiles.
   - Elder / Managed Member can be tracked directly or managed by a caregiver.
   - Doctor/Dietitian gets read-only report-style access, not full family access.

## Roles implemented

- Family Member: own meals, macros, water and progress.
- Caregiver: can help assigned profiles, log meals/water, review simple alerts.
- Elder / Managed Member: supports elders/dependents who may not use the app directly.
- Doctor Viewer: read-only, time-limited wellness report.
- Dietitian Viewer: read-only, time-limited nutrition report.

## New pages

- `/family` — redesigned Family Wellness Center.
- `/accept-invite` — role-based invite acceptance.
- `/shared-report` — read-only doctor/dietitian report view.

## New API routes

- `POST /api/invite-family` — sends role-based invite email.
- `POST /api/accept-family-invite` — marks invite accepted when Supabase service role is configured.
- `POST /api/share-report` — emails a read-only report link to a doctor or dietitian.

## Database tables added

Run the updated `database/supabase-schema.sql` in Supabase SQL Editor.

New tables:

- `family_groups`
- `family_invites`
- `family_members`
- `managed_profiles`
- `profile_permissions`
- `shared_reports`
- `access_audit_logs`

The client also has local-storage fallback so the UI works during development before the full database workflow is connected.

## Recommended Vercel env vars

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxx
INVITE_FROM_EMAIL=Eatlyte <hello@mail.eatlyte.app>
NEXT_PUBLIC_APP_URL=https://eatlyte.app
NEXT_PUBLIC_SITE_URL=https://eatlyte.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # optional but recommended for production invite/report audit tables
```

## Safety

Professional access is intentionally read-only and time-limited. Doctors and dietitians should receive reports, not permanent family-member access. The app includes health disclaimers and avoids diagnosis/treatment claims.
