# Premium Upgrade Notes

This build adds the requested user-facing upgrades:

## 1. Smart Daily Health Score
- Adds a 0-100 score with visible breakdown.
- Factors calories, protein, fiber, sugar, water, steps, and medicine check-in.
- Keeps safety-first wellness wording.

## 2. Food Tracking Upgrade
- Removed the food source dropdown from the UI.
- User only enters food name/smart text and meal.
- Search automatically checks local foods, USDA API, and Open Food Facts.
- Supports smart entries like `2 roti`, `250 ml milk`, `150g rice lunch`.

## 3. Favorites + Recent Foods
- Existing favorites remain.
- Recently added foods are now shown for one-tap repeat logging.

## 4. Visual Improvements
- More lively food cards with emoji visuals.
- Added nutrition chips for calories, protein, sugar, and fiber.
- Added 7-day sugar trend chart.
- Added mobile bottom navigation.

## 5. Report Scanner Upgrade
- Upload/camera report preview.
- Doctor visit question generator based on recent vitals/labs.
- Still avoids medical diagnosis and keeps doctor/dietitian guidance.

## 6. Mobile Navigation UX
- Bottom navigation for Dashboard, Food, AI, Reports, and Profile.
- Existing desktop tabs remain available on larger screens.

## Deployment Reminder
Keep your working `vercel.json` rewrite if deploying on Vercel:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

For GitHub Pages, serverless API routes will not run directly. AI and USDA backend routes need Vercel/Cloudflare/Netlify backend.
