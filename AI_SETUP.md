# AI Wellness Assistant Setup

This project includes an AI Wellness Coach tab and a serverless API route:

- Frontend: `index.html`, `app.js`, `style.css`
- Backend route: `api/ai-suggestions.js`

## Important Safety Positioning

The AI assistant provides general wellness, nutrition, exercise, weight, and caregiver suggestions only. It must not diagnose, prescribe medication, change medication, or replace a doctor/registered dietitian.

## Vercel Environment Variable

Add this environment variable in Vercel:

```text
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

Then redeploy with clear cache.

## Test

After deployment:

1. Open the website.
2. Save a profile.
3. Add food and vitals.
4. Open `AI Coach` tab.
5. Click `Generate AI Wellness Plan`.

## AI Voice Food Logger

New endpoint:

```text
/api/ai-food-logger
```

Required Vercel environment variable:

```text
DEEPSEEK_API_KEY=your_deepseek_key
```

The frontend never stores voice recordings. Browser speech recognition converts speech to text locally/browser-side, then the text is sent to the backend parser. The app always shows a confirmation screen before saving foods to the user food log.

Example voice commands:

```text
Add 2 chapatis and 250 ml milk for breakfast
I had 150 grams rice and one bowl dal for lunch
Add one banana as snack
I drank 1 glass orange juice at 8 AM
```

The parser extracts food name, quantity, unit, meal, and time. Nutrition values are matched from local foods first, then USDA fallback when available.
