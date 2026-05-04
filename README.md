# NutriFamily Elder Pro

Professional plain HTML/CSS/JavaScript PWA for family nutrition and elder wellness tracking.

## What is included

- Supabase email and Google login
- One profile per login
- Nutrition targets: calories, protein, carbs, fats, fiber, sodium, water, steps
- Food search from local Indian/global foods, USDA API, and Open Food Facts
- Meal-wise daily tracking
- Elder daily health/vitals tracking
- Report upload and phone camera scan input
- Manual lab value tracking with safety review notes
- Elder-safe exercise plan and exercise logging
- Caregiver daily checklist
- Chart.js dashboard charts
- PWA service worker and manifest
- Supabase SQL schema with RLS policies

## Files

```text
index.html
style.css
app.js
config.js
manifest.json
sw.js
data/foods.js
data/exercises.js
data/healthRules.js
api/config.js
api/usda.js
supabase-schema.sql
```

## Vercel environment variables

Set these in Vercel Project Settings > Environment Variables:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
USDA_API_KEY
```

The app reads Supabase config from `/api/config`, so you do not need to hardcode keys in `config.js`.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase-schema.sql`.
4. Enable Auth providers:
   - Email/password
   - Google provider
5. Add your Vercel URL in Supabase Auth redirect URLs.
6. Create a private Storage bucket named:

```text
health-reports
```

7. Add storage policies so users can access only files under their own user ID folder.

## Local development

```bash
npm install
npm run start
```

For Vercel serverless routes locally:

```bash
npm i -g vercel
vercel dev
```

## Important safety note

This app is for wellness tracking only. It does not diagnose, prescribe medication, or replace doctor/dietitian advice. For diabetes, BP, kidney, heart, thyroid, medication, abnormal labs, severe symptoms, or emergency concerns, contact a qualified clinician.

## Next production phase

The UI currently stores daily logs locally for a smooth beginner-friendly version. The SQL schema already includes cloud tables for food, vitals, labs, exercise, and reports. Next enhancement should sync those logs to Supabase tables with offline-first conflict handling.
