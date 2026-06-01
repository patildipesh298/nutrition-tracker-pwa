# Eatlyte Food Database API Keys

Eatlyte now uses a layered food database strategy:

1. Built-in Eatlyte common foods, including Indian foods
2. USDA FoodData Central for verified generic/nutrient data
3. Open Food Facts for packaged and barcode foods
4. FatSecret optional for global branded/restaurant foods
5. Optional paid APIs later: Edamam, Nutritionix, Nutritics

---

## 1. USDA FoodData Central

Best for: verified generic foods, raw ingredients, nutrient values.

Get key:

```txt
https://fdc.nal.usda.gov/api-key-signup
```

Add in Vercel:

```env
USDA_API_KEY=your_key
```

---

## 2. Open Food Facts

Best for: barcode lookup and packaged foods.

Docs:

```txt
https://openfoodfacts.github.io/openfoodfacts-server/api/
```

No API key is required for standard read/search usage.

The app uses Open Food Facts for:

```txt
/api/barcode-lookup
/api/food-search
```

---

## 3. FatSecret Platform API

Best for: global foods, branded foods, restaurant foods, and future AI food logging.

Register:

```txt
https://platform.fatsecret.com/register
```

Add in Vercel:

```env
FATSECRET_CLIENT_ID=your_client_id
FATSECRET_CLIENT_SECRET=your_client_secret
```

---

## 4. Edamam optional

Best for: nutrition analysis, recipe analysis, multilingual ingredient parsing, advanced diet/allergy labels.

Developer portal:

```txt
https://developer.edamam.com/edamam-nutrition-api
```

Not required for current build.

---

## 5. Nutritionix optional

Best for: branded and restaurant foods in the US/Canada.

API page:

```txt
https://www.nutritionix.com/api
```

Note: public free trials may not be available, so this is better for later commercial licensing.

---

## Recommended launch configuration

For launch, configure:

```env
USDA_API_KEY=required
OPENAI_API_KEY=required_for_photo_and_label_scan
RESEND_API_KEY=required_for_invites
FATSECRET_CLIENT_ID=optional
FATSECRET_CLIENT_SECRET=optional
```
