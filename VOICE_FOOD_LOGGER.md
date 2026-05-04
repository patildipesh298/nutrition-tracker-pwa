# AI Voice Food Logger

## What was added

- Mobile-friendly AI Voice Food Logger card in the Food tab.
- Browser speech-to-text using `SpeechRecognition` / `webkitSpeechRecognition`.
- DeepSeek-powered food sentence parser through `/api/ai-food-logger`.
- Local fallback parser if AI endpoint fails.
- Confirmation/edit screen before adding foods.
- Quantity support for g, ml, serving, cup, bowl, glass, piece, tbsp, tsp.
- Local food matching first, USDA fallback second.
- No audio recording storage.

## Vercel setup

Use this `vercel.json`:

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

Add this environment variable in Vercel:

```text
DEEPSEEK_API_KEY=your_key
```

Then redeploy with Clear Build Cache.

## Important safety design

The app does not silently save AI-detected foods. The user must review and confirm the detected items first.
