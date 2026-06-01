# Eatlyte — Next.js Production App

Production-grade, mobile-first migration from the original Vanilla JS PWA into **Next.js + React + TypeScript** with Vercel API routes.

## Restored / migrated modules

- Premium mobile-first dashboard
- Profile creation and one-profile-per-login flow direction
- Food logger with voice parser, photo scanner, food search, manual entry and meal diary
- Individual vitals tracking: BP, glucose, pulse, water, steps, symptoms
- Separate Family Health Graph page
- Family invite email API with Resend
- Reports and lab values
- Exercise / movement plan
- Wellness insights page
- Toast prompts after form submissions
- LocalStorage-backed working demo plus Supabase schema for production persistence
- Vercel-ready API routes for meal parsing, photo scanning, USDA and Resend

## Deploy on Vercel

Use repo root settings:

- Framework Preset: Next.js
- Root Directory: blank/default
- Output Directory: blank/default
- Build Command: default

## Vercel environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
USDA_API_KEY=
RESEND_API_KEY=
INVITE_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

## Supabase

Open `database/supabase-schema.sql`, paste it into Supabase SQL Editor, and run it.

## Notes

This version is designed for testing as a deployed web app. It stores demo data in browser LocalStorage immediately, while API integrations work when keys are configured in Vercel. For full multi-device persistence, wire the same forms to Supabase tables created by the schema.

## New food logging features

This version adds four mobile-first quick actions on the Food Logger page:

- **+ Add Food**: custom entry for homemade or unknown foods.
- **Meal Photo**: plate/photo meal scanner using the existing OpenAI vision API route.
- **Barcode**: camera barcode scanner using the browser BarcodeDetector API with Open Food Facts lookup. Manual barcode entry is included as fallback.
- **Food Label**: nutrition facts label scanner using OpenAI vision, with editable values before saving.

### Notes for barcode scanning

Barcode camera scanning requires HTTPS and browser support. It works best on mobile Chrome/Edge. iOS Safari support can vary, so manual barcode entry remains available.

### API routes added

- `/api/barcode-lookup?code=...` uses Open Food Facts and does not require an API key.
- `/api/food-label-scanner` uses `OPENAI_API_KEY` for nutrition label extraction.
