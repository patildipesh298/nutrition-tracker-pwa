/* =============================================================================
   Eatlyte — "Three ways to log" + "Why Eatlyte" landing section
   -----------------------------------------------------------------------------
   Cal-AI-inspired PATTERN (not their copy/branding/stats): lead with the three
   logging methods, then a tight reasons block. Honest value props only — no
   invented ratings, user counts, or testimonials.

   HOW TO USE
   1. Drop this section INSIDE your existing landing <main> (app/page.tsx),
      right after your <section className="premium-hero"> block.
   2. It reuses classes already defined in the consolidated globals.css
      (.feature-grid-premium, .feature-card-premium, .eyebrow, .section-title,
      .trust-pill, .hero-proof) — no extra CSS required.
   3. All icons are from lucide-react, which your project already uses.
   ============================================================================= */
import { Camera, ScanBarcode, Sparkles, HeartPulse, Users, ShieldCheck } from 'lucide-react';

export default function LogWaysSection() {
  const logWays = [
    { icon: Camera, title: 'Snap a photo', text: 'Point your camera at the plate. Eatlyte estimates the foods, portions and macros so you can log in seconds.' },
    { icon: ScanBarcode, title: 'Scan a barcode', text: 'Scan any packaged item to pull verified nutrition facts straight from the label and food databases.' },
    { icon: Sparkles, title: 'Describe it', text: 'Type or speak what you ate in plain language — “two rotis, dal and a bowl of curd” — and it’s logged.' },
  ];

  const reasons = [
    { icon: HeartPulse, title: 'Macros and micros, not just calories', text: 'Track protein, fiber, sugar, sodium, iron, calcium and more — with goals that adapt to age, activity and conditions.' },
    { icon: Users, title: 'Built for families and caregivers', text: 'Manage meals for a parent, child or elder, and share read-only summaries with a doctor or dietitian when it helps.' },
    { icon: ShieldCheck, title: 'Wellness-first and private', text: 'Gentle, non-judgmental guidance. Your data stays yours, and clinical sharing always expires automatically.' },
  ];

  return (
    <section className="log-ways-section" style={{ marginTop: '48px' }}>
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 28px' }}>
        <span className="eyebrow">Logging in seconds</span>
        <h2 className="section-title" style={{ marginTop: 8 }}>Three ways to log a meal</h2>
        <p className="hero-subtitle" style={{ margin: '12px auto 0' }}>
          Photo, barcode, or a quick description — choose whatever is fastest in the moment. No manual calorie math.
        </p>
      </div>

      <div className="feature-grid-premium" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {logWays.map(({ icon: Icon, title, text }) => (
          <div key={title} className="feature-card-premium">
            <Icon size={30} strokeWidth={2} />
            <b>{title}</b>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', maxWidth: 720, margin: '56px auto 24px' }}>
        <span className="eyebrow">Why Eatlyte</span>
        <h2 className="section-title" style={{ marginTop: 8 }}>More than a calorie counter</h2>
      </div>

      <div className="feature-grid-premium" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {reasons.map(({ icon: Icon, title, text }) => (
          <div key={title} className="feature-card-premium">
            <Icon size={30} strokeWidth={2} />
            <b>{title}</b>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className="hero-proof" style={{ justifyContent: 'center', marginTop: 28 }}>
        <span><ShieldCheck size={17} /> Privacy-first</span>
        <span><Users size={17} /> Family &amp; caregiver ready</span>
        <span><HeartPulse size={17} /> Macros + micronutrients</span>
      </div>
    </section>
  );
}
