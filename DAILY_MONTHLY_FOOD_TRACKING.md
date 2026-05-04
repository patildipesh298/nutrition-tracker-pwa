# Daily and Monthly Food Tracking Upgrade

This build adds date-based nutrition tracking so users can add foods for any selected day instead of only today.

## Added

- Food diary date picker
- Previous / next day navigation
- Today shortcut
- Meal summary for Breakfast, Lunch, Dinner, Snacks
- Add searched food, custom food, favorite food, typed AI food, or voice AI food to the selected date
- Selected-day calorie, sugar, protein, and fiber totals
- Monthly food calendar
- Monthly logged days, average calories, total sugar, and total protein
- Tap a calendar day to add or review food for that day

## User flow

1. Open Food tab.
2. Select a diary date.
3. Add food through search, favorite, manual entry, typed AI, or voice AI.
4. Review meal totals and monthly calendar.

## Notes

- The app still stores logs in browser localStorage unless you extend the Supabase schema for cloud sync.
- This feature is mobile-first and works well as a PWA.
