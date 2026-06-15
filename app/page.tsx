export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { BarChart3, Camera, CheckCircle2, HeartPulse, Lock, ScanBarcode, ShieldCheck, Sparkles, Users, Utensils, type LucideIcon } from 'lucide-react';

const features = [
  { icon: Utensils, title: 'Log meals in seconds', text: 'Search, photo, barcode, label scan, or custom entry — built for daily use.' },
  { icon: BarChart3, title: 'Know what matters', text: 'Calories, protein, carbs, fats, fiber, sugar, sodium and key micronutrients.' },
  { icon: Users, title: 'Family-ready tracking', text: 'Separate profiles and practical guidance for shared meal routines.' },
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
        <div className="marketing-links"><Link href="/privacy">Privacy</Link><Link href="/support">Support</Link><Link className="btn btn-primary" href="/login">Start free</Link></div>
      </section>

      <section className="premium-hero compact-hero">
        <div className="premium-hero-copy">
          <div className="trust-pill"><ShieldCheck size={16}/> Safe nutrition tracking for real life</div>
          <h1>Eat better with clear daily guidance.</h1>
          <p className="hero-subtitle">Eatlyte turns meals, macros, water, micronutrients and family routines into simple actions you can trust.</p>
          <div className="hero-actions"><Link className="btn btn-primary" href="/login">Start free</Link><Link className="btn btn-soft" href="/dashboard">Preview app</Link></div>
          <div className="hero-proof"><span><CheckCircle2/> Explainable insights</span><span><CheckCircle2/> Family profiles</span><span><CheckCircle2/> Privacy-first</span></div>
        </div>
        <div className="phone-showcase" aria-label="Eatlyte app preview">
          <div className="phone-frame refined-phone">
            <div className="phone-status"><span>11:32</span><i/></div>
            <div className="phone-app-head"><img src="/logo-mark.svg" alt=""/><b>Today</b><span>3 day streak</span></div>
            <div className="phone-ring-card">
              <div><small>Calories</small><b>1,642</b><em>408 kcal remaining</em></div>
              <div className="hero-ring"><span>80%</span></div>
            </div>
            <div className="phone-macros"><article><span>Pro</span><b>82g</b><small>Protein</small></article><article><span>Carb</span><b>190g</b><small>Carbs</small></article><article><span>Fat</span><b>54g</b><small>Fats</small></article></div>
            <div className="phone-chart"><i/><i/><i/><i/><i/><i/></div>
            <div className="phone-tabs">{logWays.map(([label, Icon]) => <span key={label}><Icon size={17}/>{label}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="feature-grid-premium compact-feature-grid">{features.map(({icon:Icon,title,text}) => <article key={title} className="feature-card-premium"><Icon/><b>{title}</b><p>{text}</p></article>)}</section>

      <section className="science-panel compact-science-panel">
        <div><p className="eyebrow">Built for commercial wellness</p><h2>Guidance without medical overreach.</h2><p>Track quality, consistency and progress with clear disclaimers, secure auth and nutrition insights based on real logged data.</p></div>
        <div className="science-list"><span><Lock/> Secure auth and privacy pages</span><span><HeartPulse/> Safe wellness boundaries</span><span><BarChart3/> Progress trends that are easy to read</span></div>
      </section>
    </main>
  );
}
