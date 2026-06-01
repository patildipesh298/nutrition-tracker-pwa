# Eatlyte final logo and commercial readiness notes

## Logo direction
The final mark uses a small set of ideas that match the product:

- Dark rounded app badge: premium, readable, and strong on mobile.
- Plate/bowl curve: meals and food logging.
- Fork: eating and daily meal tracking.
- Leaf/food shapes: nutrition and balanced meals.
- Coral/gold progress arc: calorie/macros progress and daily goals.

The app header intentionally uses the logo mark only. The Eatlyte wordmark is still included in `public/logo.svg` for landing pages, app store screenshots, social images, and marketing.

## Implemented in this build
- Updated `public/logo-mark.svg`.
- Updated `public/logo.svg`.
- Updated `public/favicon.svg`.
- Updated `public/apple-touch-icon.svg`.
- Added PNG app assets: `logo-180.png`, `logo-192.png`, `logo-512.png`, and `logo-1024.png`.
- Updated `manifest.json` to use PNG icons for better PWA/app compatibility.
- Updated service worker cache to refresh logo assets.

## Remaining before commercialization
1. Final real-device QA on iPhone Safari, Android Chrome, and desktop.
2. Verify Supabase auth, RLS policies, and profile creation for a brand-new user.
3. Verify production environment variables in Vercel.
4. Add Terms, Privacy Policy, medical/nutrition disclaimer, and support/contact page.
5. Add analytics and error monitoring.
6. Add real app-store assets: 1024px icon, screenshots, short/long descriptions, privacy nutrition labels, and support URL.
7. Improve food database coverage with USDA/Open Food Facts and verified Indian/common foods.
8. Validate email domain for family invites before public launch.
