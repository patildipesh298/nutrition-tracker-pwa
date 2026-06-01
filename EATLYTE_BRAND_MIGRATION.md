# Eatlyte Brand Migration

This package updates the app from the old NutriFamily public brand to the new Eatlyte brand.

## Changed

- App title and metadata updated to Eatlyte.
- Manifest and PWA settings updated to Eatlyte.
- Header brand text updated to Eatlyte.
- Public landing page updated with Eatlyte positioning.
- Supabase browser config global renamed to `__EATLYTE_SUPABASE__`.
- API prompts, invite emails, barcode user agent, README/package names updated.
- Added new logo files:
  - `/public/logo.svg`
  - `/public/logo-mark.svg`
  - `/public/favicon.svg`
  - `/public/apple-touch-icon.svg`
- Added SEO basics:
  - `/public/robots.txt`
  - `/public/sitemap.xml`

## Recommended Vercel environment variables

```bash
NEXT_PUBLIC_APP_URL=https://eatlyte.app
NEXT_PUBLIC_SITE_URL=https://eatlyte.app
INVITE_FROM_EMAIL=Eatlyte <hello@eatlyte.app>
```

## Recommended DNS/domain setup

- Primary: `https://eatlyte.app`
- Redirect: `https://www.eatlyte.app` → `https://eatlyte.app`

## Logo direction

The logo uses a premium black rounded-square app mark, a clean plate/ring shape, the letter E, and a small warm food accent. It is simple enough for app icons while still making sense for food/nutrition tracking.
