# Mobile Expo + EAS CI/CD Plan

This plan should be used when adding the React Native + Expo mobile app.

## Mobile app baseline

Create `apps/mobile` with:
- Expo SDK.
- TypeScript.
- Expo Router.
- NativeWind or Tamagui.
- Supabase Auth with Google and Apple login.
- RevenueCat for subscriptions.
- Expo Notifications for reminders.
- Sentry for crash reporting.
- PostHog or Firebase Analytics with privacy-safe event design.

## Shared nutrition logic

Move reusable logic into `packages/core` before duplicating business rules:
- calorie target calculation.
- macro target calculation.
- nutrition score engine.
- food quality scoring.
- safety/disclaimer copy.
- family member target helpers.

## EAS GitHub secrets required later

Add these only after the Expo app exists:
- `EXPO_TOKEN`
- `EAS_PROJECT_ID`
- `APPLE_ID`
- `ASC_APP_ID`
- `ASC_API_KEY_ID`
- `ASC_API_ISSUER_ID`
- `ASC_API_KEY_P8`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `SENTRY_AUTH_TOKEN`
- `REVENUECAT_API_KEY`

## EAS workflow phases

### Phase A: internal builds
- Trigger manually from GitHub Actions.
- Run typecheck/tests first.
- Build Android preview profile.
- Build iOS preview profile.
- Do not auto-submit to stores.

### Phase B: TestFlight and Play internal testing
- Trigger manually with environment approval.
- Build production profile.
- Submit to TestFlight.
- Submit to Google Play internal testing.

### Phase C: production release
- Tag release, for example `mobile-v1.0.0`.
- Require manual GitHub environment approval.
- Submit to Apple/Google for review.

## Safety checks before mobile release

- No medical diagnosis claims.
- Clear AI/nutrition estimate disclaimers.
- Camera/photo permission copy explains food scanning use.
- Account deletion path exists.
- Data export or support request path exists.
- Apple login is available if Google login is available on iOS.
- RevenueCat entitlements are tested in sandbox.
