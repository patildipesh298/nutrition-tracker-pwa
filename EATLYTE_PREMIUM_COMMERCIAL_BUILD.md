# Eatlyte Premium Commercial Build

This build focuses on a Cronometer-grade direction: clear hierarchy, premium mobile cards, simple nutrition rings, relevant progress charts, robust food search, legal pages, telemetry and a professional logo.

## Included

- Premium light-only UI system with polished cards, macro rings, mobile tabbar, charts and legal pages.
- New professional logo based on the best concept: progress gauge + fresh meal bowl + wellness mark.
- Public pages: Privacy Policy, Terms of Use, Medical & Nutrition Disclaimer and Support Center.
- Expanded food database: built-in common Indian foods plus USDA FoodData Central, Open Food Facts packaged foods and optional FatSecret branded/restaurant search.
- Analytics/error foundation: client page-view tracking, client error capture, unhandled promise rejection capture, `/api/telemetry`, optional Sentry forwarding.

## Environment variables to set in Vercel

```bash
NEXT_PUBLIC_SITE_URL=https://eatlyte.app
NEXT_PUBLIC_APP_URL=https://eatlyte.app
USDA_API_KEY=<your USDA FoodData Central key>
FATSECRET_CLIENT_ID=<optional>
FATSECRET_CLIENT_SECRET=<optional>
SENTRY_DSN=<optional>
NEXT_PUBLIC_GA_ID=<optional>
NEXT_PUBLIC_POSTHOG_KEY=<optional>
```

## Before public launch

1. Replace placeholder legal wording with lawyer-reviewed policies.
2. Verify Resend domain and use `Eatlyte <hello@eatlyte.app>` for email.
3. Test a brand-new account on mobile Safari and Android Chrome.
4. Test food search: bread, roti, dal, chicken tikka, oats, Greek yogurt, Costco yogurt, Amul dahi.
5. Test barcode scan and manual label fallback.
6. Configure analytics dashboard and Sentry alerting.
7. Prepare app store assets: 1024 icon, screenshots, privacy nutrition labels, support URL.
