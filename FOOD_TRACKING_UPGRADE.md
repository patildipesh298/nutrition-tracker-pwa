# Food Tracking Upgrade

This version adds a mobile-friendly food tracking flow:

- Exact quantity entry in grams (`g`), milliliters (`ml`), or servings
- Sugar-focused tracking for diabetes/wellness awareness
- Favorite foods for one-tap repeat logging
- Manual custom food entry using nutrition values per 100g or 100ml
- Today summary cards for calories, sugar, protein, and fiber
- Better mobile layout for PWA use

Safety note: sugar values are total logged sugar when available, not always added sugar. For diabetes, kidney, heart, blood pressure, thyroid, pregnancy, abnormal labs, or medication-related decisions, users should confirm targets with a doctor or registered dietitian.

## GitHub Pages note
GitHub Pages can host the frontend only. API routes under `/api` do not run on GitHub Pages. For USDA and AI features, keep a small backend on Vercel/Cloudflare/Netlify and set `API_BASE_URL` in `config.js`.
