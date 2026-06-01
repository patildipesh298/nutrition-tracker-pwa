# Eatlyte Engagement & Family Habit Update

This build adds engagement features designed to make Eatlyte more useful and enjoyable without encouraging unsafe dieting or obsessive tracking.

## Added

### Daily Quests on Home
- Log first meal
- Protein helper
- Water check-in
- Post-meal walk
- Fiber boost
- Complete the day

Each quest has progress, points, and a clear call-to-action. Points reward consistency and healthy habits, not weight loss.

### Achievement Badges
- First Log
- Full Day
- Hydration Hero
- Moved Today
- Care Circle
- Consistency

Badges are unlocked from real logged activity and family setup actions.

### Family Together Board
The Family page now includes a `Together` tab with:
- Family points
- Family missions
- Care/wellness badges
- Conversation prompts for family check-ins

### Safer Engagement Design
The app avoids leaderboards based on weight, calories, or body size. Instead it rewards:
- Logging consistency
- Hydration
- Movement
- Protein/fiber awareness
- Family care setup

## UX Goal
Make users and families come back daily because the app feels useful, simple, supportive, and motivating — not overwhelming or judgmental.

## Files Updated
- `lib/engagement.ts`
- `components/ClientDashboard.tsx`
- `components/FamilyClient.tsx`
- `app/globals.css`
- `tsconfig.json`

## Validation
- `npm ci --no-audit --no-fund --prefer-offline` passed.
- `npm run typecheck` passed.
- `npm run build` compiled and generated static pages successfully, then timed out during final trace collection in the sandbox environment.
