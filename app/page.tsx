export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { BarChart3, Camera, CheckCircle2, HeartPulse, Lock, ScanBarcode, ShieldCheck, Sparkles, Users, Utensils, type LucideIcon } from 'lucide-react';

const features = [
  { icon: Utensils, title: 'Food logging that feels easy', text: 'Search foods, scan barcodes, add labels, use voice, or save homemade meals.' },
  { icon: BarChart3, title: 'Macros and micros together', text: 'See calories, protein, carbs, fats, fiber, sodium, sugar and key vitamins.' },
  { icon: Users, title: 'Built for families too', text: 'Track individual profiles, shared habits and family-friendly meal patterns.' },
  { icon: ShieldCheck, title: 'Safe wellness guidance', text: 'Clear disclaimers and doctor-informed nutrition boundaries built in.' },
];

const logWays: Array<[string, LucideIcon]> = [
  ['Photo', Camera],
  ['Barcode', ScanBarcode],
  ['Search', Utensils],
  ['Insights', Sparkles],
];

export default function Home() {
  return (
    <main className="marketing-shell">
      <section className="marketing-nav">
        <div className="brand-lockup"><img src="/logo-mark.svg" alt="Eatlyte" /><span>Eatlyte</span></div>
        <div className="marketing-links"><Link href="/privacy">Privacy</Link><Link href="/support">Support</Link><Link className="btn btn-primary" href="/dashboard">Open app</Link></div>
      </section>

      <section className="premium-hero">
        <div className="premium-hero-copy">
          <div className="trust-pill"><ShieldCheck size={16}/> Nutrition tracking for everyday life</div>
          <h1>Eat smarter. Track easier.</h1>
          <p className="hero-subtitle">A premium mobile-first nutrition tracker for meals, macros, BMI, micronutrients, AI food insights and family wellness.</p>
          <div className="hero-actions"><Link className="btn btn-primary" href="/login">Start free</Link><Link className="btn btn-soft" href="/dashboard">Preview app</Link></div>
          <div className="hero-proof"><span><CheckCircle2/> Simple daily logging</span><span><CheckCircle2/> Family ready</span><span><CheckCircle2/> Privacy-first</span></div>
        </div>
        <div className="phone-showcase" aria-label="Eatlyte app preview">
          <div className="phone-frame">
            <div className="phone-status"><span>11:32</span><i/></div>
            <div className="phone-app-head"><img src="/logo-mark.svg" alt=""/><b>Today</b><span>🔥 3</span></div>
            <div className="phone-ring-card">
              <div><small>Calories</small><b>1,642</b><em>of 2,050 kcal</em></div>
              <div className="hero-ring"><span>80%</span></div>
            </div>
            <div className="phone-macros"><article><span>🍗</span><b>82g</b><small>Protein</small></article><article><span>🌾</span><b>190g</b><small>Carbs</small></article><article><span>🥑</span><b>54g</b><small>Fats</small></article></div>
            <div className="phone-chart"><i/><i/><i/><i/><i/><i/></div>
            <div className="phone-tabs">{logWays.map(([label, Icon]) => <span key={label}><Icon size={17}/>{label}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="feature-grid-premium">{features.map(({icon:Icon,title,text}) => <article key={title} className="feature-card-premium"><Icon/><b>{title}</b><p>{text}</p></article>)}</section>

      <section className="science-panel">
        <div><p className="eyebrow">Commercial-ready foundation</p><h2>More than a calorie counter.</h2><p>Track meal quality, water, exercise, BMI, family profiles, barcode foods, nutrition labels and weekly progress in one clean workflow.</p></div>
        <div className="science-list"><span><Lock/> Secure auth and privacy pages</span><span><HeartPulse/> Health disclaimer and safe guidance</span><span><BarChart3/> Premium charts and trend cards</span></div>
      </section>
    </main>
  );
}
