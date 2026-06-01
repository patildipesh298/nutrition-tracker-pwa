import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    __EATLYTE_SUPABASE__?: {
      url?: string;
      anonKey?: string;
    };
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfig() {
  const browserConfig = typeof window !== 'undefined' ? window.__EATLYTE_SUPABASE__ : undefined;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    browserConfig?.url ||
    '';

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    browserConfig?.anonKey ||
    '';

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    isReady: Boolean(url?.trim() && anonKey?.trim()),
  };
}

export function getSupabase() {
  const config = getSupabaseConfig();
  if (!config.isReady) return null;

  if (!cachedClient) {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cachedClient;
}
