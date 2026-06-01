import type { Metadata } from 'next';
import Script from 'next/script';
import AppShell from '@/components/AppShell';
import AnalyticsProvider from '@/components/AnalyticsProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eatlyte | Food, Macros & Family Nutrition Tracker',
  description: 'Eatlyte is a premium mobile-first nutrition tracker for food logging, macro rings, BMI, progress charts, AI meal insights, micronutrients and family wellness.' ,
  manifest: '/manifest.json',
  applicationName: 'Eatlyte',
  appleWebApp: { capable: true, title: 'Eatlyte', statusBarStyle: 'default' },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://eatlyte.app'),
  openGraph: {
    title: 'Eatlyte | Eat smarter. Track easier.',
    description: 'Simple nutrition tracking for everyday meals and family wellness.',
    url: 'https://eatlyte.app',
    siteName: 'Eatlyte',
    type: 'website',
  },
  formatDetection: { telephone: false },
  icons: { icon: [{ url: '/favicon.svg' }, { url: '/logo-192.png', sizes: '192x192', type: 'image/png' }], apple: '/logo-180.png' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF7EF' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  return (
    <html lang="en">
      <body>
        <Script
          id="eatlyte-public-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__EATLYTE_SUPABASE__=${JSON.stringify({
              url: supabaseUrl,
              anonKey: supabaseAnonKey,
            })};`,
          }}
        />
        <AnalyticsProvider />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
