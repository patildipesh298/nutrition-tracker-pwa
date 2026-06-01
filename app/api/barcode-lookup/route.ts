import { NextRequest, NextResponse } from 'next/server';

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOpenFoodFactsProduct(product: any) {
  const n = product?.nutriments || {};
  const sodium = n.sodium_serving ?? n.sodium_100g;
  return {
    name: product?.product_name || product?.generic_name || 'Scanned packaged food',
    brand: product?.brands || '',
    serving: product?.serving_size || '100g',
    cal: num(n['energy-kcal_serving'] ?? n['energy-kcal_100g']),
    p: num(n.proteins_serving ?? n.proteins_100g),
    c: num(n.carbohydrates_serving ?? n.carbohydrates_100g),
    f: num(n.fat_serving ?? n.fat_100g),
    fiber: num(n.fiber_serving ?? n.fiber_100g),
    sugar: num(n.sugars_serving ?? n.sugars_100g),
    sodium: num(sodium) * 1000,
    nutriScore: product?.nutriscore_grade || product?.nutriscore?.grade || '',
    ingredients: product?.ingredients_text || '',
    image: product?.image_front_small_url || product?.image_url || '',
    source: 'Packaged food database',
  };
}

async function lookupOpenFoodFacts(code: string) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
    headers: { 'User-Agent': 'Eatlyte/1.0 (contact: support@eatlyte.app)' },
    next: { revalidate: 60 * 60 * 24 },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== 1 || !data.product) return null;
  return normalizeOpenFoodFactsProduct(data.product);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim();
  if (!code) return NextResponse.json({ error: 'Barcode code is required' }, { status: 400 });

  try {
    const product = await lookupOpenFoodFacts(code);
    if (!product) {
      return NextResponse.json({ error: 'Product not found. Try manual label entry or search by product name.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Barcode lookup failed' }, { status: 500 });
  }
}
