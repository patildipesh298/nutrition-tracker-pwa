# Eatlyte AI Coding Instructions

You are working on Eatlyte, a commercial nutrition and family wellness app.

## Product goal
Build a premium, simple, mobile-first nutrition tracker for individuals and families. Eatlyte should feel like a trusted personal nutrition assistant, not just a calorie calculator.

## Nutrition, health, and dietitian responsibility
When developing Eatlyte, think like a professional app developer, nutritionist, health coach, family dietitian, individual dietitian, and doctor-informed wellness product advisor.

Eatlyte should help users safely track, understand, and improve nutrition through:
- Daily food tracking.
- Calorie tracking.
- Protein, carbs, fats, fiber, sugar, sodium, and key micronutrients.
- Water tracking.
- Weight goals.
- Family nutrition tracking.
- Individual diet plans.
- Healthy meal suggestions.
- Food quality scoring.
- Nutrition insights.
- Progress trends.
- Habit building.
- Personalized wellness recommendations.
- Safe, explainable nutrition guidance.

## Health disclaimer and safety boundaries
Eatlyte is a wellness/nutrition app, not a medical diagnosis app. Do not provide medical diagnosis or replace a licensed doctor. Any health, diet, or nutrition suggestions must be general wellness guidance unless the user provides specific verified professional requirements.

Do not add:
- Medical diagnosis.
- Crash diets.
- Extreme calorie restriction.
- Over-supplementation claims.
- Unverified medical claims.
- One-size-fits-all diet plans.
- Advice that conflicts with medical conditions.
- Unsafe guidance for children, pregnant users, elderly users, people with chronic illness, allergies, medication concerns, or eating disorders.

For medical conditions, pregnancy, children, elderly users, diabetes, kidney disease, heart disease, eating disorders, allergies, or medication-related concerns, recommend consulting a licensed doctor or registered dietitian.

## Nutrition product principles
Before adding or changing a nutrition-related feature, consider:
1. Does this help the user eat better?
2. Does this help the user understand their nutrition?
3. Is this safe and explainable?
4. Is this useful for both individuals and families?
5. Is this easy for a normal user to use daily?
6. Does this avoid misleading medical claims?
7. Does this support long-term healthy habits?

Dietitian-style product thinking must include:
- Meal balance.
- Macro balance.
- Calorie quality.
- Protein adequacy.
- Fiber intake.
- Hydration.
- Sugar and sodium awareness.
- Portion control.
- Goal-based recommendations.
- Age-appropriate guidance.
- Family-friendly meal planning.
- Cultural food flexibility.
- Practical Indian and global food options.
- Budget-friendly healthy choices.

## Personalization requirements
Eatlyte should support personalization based on:
- Age.
- Gender.
- Height.
- Weight.
- Activity level.
- Goal: weight loss, maintenance, muscle gain, or general wellness.
- Dietary preference: vegetarian, vegan, non-vegetarian, Jain, gluten-free, dairy-free, and similar preferences.
- Allergies.
- Medical conditions only for safe tracking, disclaimers, and clinician/dietitian referral prompts.
- Family member profiles.
- Cuisine preference.
- Daily routine.

## Family Dietitian Mode
Family-based tracking should support one account managing multiple family members with:
- Separate nutrition profile for each family member.
- Individual calorie and macro targets.
- Child-friendly nutrition tracking.
- Elderly-friendly nutrition tracking.
- Shared grocery suggestions.
- Family meal planning.
- Alerts for missing protein, low fiber, high sugar, or high sodium.
- Simple daily family wellness summary.

## Individual Dietitian Mode
Individual users should get:
- Personal daily dashboard.
- Goal-based calorie and macro targets.
- Meal-by-meal breakdown.
- Daily nutrition score based on real logged data.
- Weekly progress trends.
- Actionable recommendations.
- Smart reminders.
- Healthy swap suggestions.
- Meal consistency insights.

## Nutrition score rules
The nutrition score must never be fixed or hardcoded. It must be calculated from real user data such as:
- Calories consumed vs goal.
- Protein intake vs target.
- Carb/fat balance.
- Fiber intake.
- Water intake.
- Sugar level.
- Sodium level.
- Meal consistency.
- Vegetable/fruit intake.
- Ultra-processed food frequency.
- Exercise/activity data, if available.

The score must be explainable. Users should see why their score is high or low and what they can improve.

## Food database rules
Food search should be robust and practical. Support:
- Common foods.
- Indian foods.
- Homemade meals.
- Packaged foods.
- Restaurant-style foods.
- Barcode-based foods.
- Custom food creation.
- Recipe creation.
- Serving size adjustment.
- Unit conversion such as grams, cups, pieces, bowl, plate, and spoon.

Food data should come from reliable sources where possible, such as USDA FoodData Central, Open Food Facts, FatSecret where licensed/configured, or a verified internal food database.

## Nutrition feature proposal format
Whenever suggesting or implementing a new nutrition-related feature, include or consider:
1. User benefit.
2. Nutrition value.
3. Technical implementation.
4. Database impact.
5. UI/UX impact.
6. Safety considerations.
7. Testing checklist.

## Dashboard priority
The nutrition dashboard should show the most important health information first:
- Calories remaining.
- Protein progress.
- Carbs and fats.
- Water intake.
- Fiber.
- Today's meals.
- Nutrition score with explanation.
- Smart insight of the day.
- Weekly trend.
- Goal progress.

## Design direction
Use warm white, cream, charcoal, coral, amber, and soft nutrition accents. Do not use a green-heavy theme. No dark theme for now.

The experience should feel:
- Trustworthy.
- Clean.
- Professional.
- Friendly.
- Family-oriented.
- Health-focused.
- Easy to understand.
- Motivating but not judgmental.

## Brand
Brand name: Eatlyte.
Domain: https://eatlyte.app.
The logo should communicate food + nutrition + progress tracking.

## Engineering rules
- Continue from existing files.
- Do not rebuild from scratch unless absolutely necessary.
- Keep mobile-first UI.
- Add loading, empty, and error states.
- Keep Supabase service-role keys server-side only.
- Never expose private API keys to the browser.
- Use migration-safe SQL.
- Do not delete existing user data.
- Use `CREATE TABLE IF NOT EXISTS`.
- Use `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
- Drop/recreate conflicting RLS policies safely.
- Make production behavior robust every time: validate inputs, handle failures, avoid silent data loss, and document manual steps.

## Core areas
- Landing page.
- Auth and onboarding.
- Home dashboard.
- Food search and add-food flow.
- Nutrition view.
- Progress charts.
- BMI.
- Family invite flow.
- Managed elder/child profiles.
- Doctor/dietitian read-only reports.
- Engagement quests and badges.
- Privacy, terms, disclaimer, support pages.
- Analytics and error monitoring.
- GitHub, Vercel, and Supabase deployment automation.

## Validation required before PR completion
Run:
- `npm ci --no-audit --no-fund --prefer-offline`
- `npm run typecheck`
- `npm run build`

If a command fails, fix the issue before finalizing the PR unless the failure is caused by an external environment limitation. Always report exact manual steps the product owner must take.

## Pull request rules
Every PR must include:
- Summary of changes.
- Files changed.
- Test results.
- Database changes, if any.
- Environment variable changes, if any.
- Screenshots or preview URL if UI changed.
- Manual steps required from the owner, if any.
