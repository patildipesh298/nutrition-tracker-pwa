# Eatlyte Theme Redesign — Simple Premium Palette

## Direction
The previous wellness-green palette was removed. The new system uses a commercial mobile-app palette that feels cleaner and more broadly appealing:

- Warm neutral backgrounds instead of harsh white.
- Deep navy dark mode instead of black or green-black.
- Indigo/blue as the primary action color because it reads trustworthy, familiar, and digital-product friendly.
- Coral/amber only as small accents for streaks, warnings, and highlights.
- Low-noise cards, softer borders, fewer gradients, and clear color roles.

## Palette

### Light theme
- Background: `#F7F6F2` warm porcelain
- Elevated background: `#FBFAF7`
- Card: `#FFFFFF`
- Soft card: `#F1EFE9`
- Heading: `#151922`
- Body text: `#2D3340`
- Muted text: `#6B7280`
- Border: `#DED9CF`
- Primary: `#4F46E5` refined indigo
- Primary 2: `#2563EB` trusted blue
- Accent: `#F97316` warm coral-orange
- Success: `#0EA5A4` teal, not green

### Dark theme
- Background: `#0F1420` deep navy
- Elevated background: `#121A2A`
- Card: `#182131`
- Soft card: `#202A3B`
- Heading: `#F8FAFC`
- Body text: `#E5E7EB`
- Muted text: `#A7B0C0`
- Border: `#303A4D`
- Primary: `#A5B4FC` soft indigo
- Primary 2: `#93C5FD` soft blue
- Accent: `#FDBA74` soft orange
- Success: `#5EEAD4` teal, not green

## UI Principles Applied

1. One dominant brand color: indigo/blue.
2. Warm neutral surfaces for comfort and readability.
3. Dark mode is not an inverted light mode; it uses layered navy surfaces.
4. Nutrition category colors are functional, not decorative:
   - Calories: blue
   - Protein: violet
   - Carbs/Fiber/Water: teal
   - Sugar/Sodium warnings: coral/red
5. Less gradient usage. Gradients are reserved for primary CTA, logo, score card, and active states.
6. Mobile-first contrast and tap targets preserved.

## Files changed

- `app/globals.css`

## Testing checklist

- Toggle light/dark mode from navbar.
- Check dashboard hero, score card, macro cards, date strip, quick-add panel, bottom nav.
- Check Food, Tracking, Exercise, Family, Reports, Coach screens for inherited color consistency.
- Verify there are no dominant green backgrounds or primary green CTA states.
- Run `npm ci`, `npm run typecheck`, and `npm run build` before deployment.
