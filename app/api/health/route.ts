import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type HealthStatus = 'ok' | 'degraded';

function present(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const checks = {
    appUrl: present(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL),
    supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    supabaseAnonKey: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
    supabaseServiceRole: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    foodDatabase: present(process.env.USDA_API_KEY) || present(process.env.FATSECRET_CLIENT_ID),
    aiFoodLogger: present(process.env.DEEPSEEK_API_KEY),
    aiVision: present(process.env.OPENAI_API_KEY),
    email: present(process.env.RESEND_API_KEY) || present(process.env.SENDGRID_API_KEY),
  };

  const required = ['appUrl', 'supabaseUrl', 'supabaseAnonKey'] as const;
  const status: HealthStatus = required.every((key) => checks[key]) ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      service: 'eatlyte-web',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: status === 'ok' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
