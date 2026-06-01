'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, Droplets, FileText, Flame, LockKeyhole, Scale, Utensils } from 'lucide-react';
import { readLS } from '@/lib/storage';
import { SharedReport, SHARED_REPORTS_KEY } from '@/lib/family';

export default function SharedReportClient() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const reports = readLS<SharedReport[]>(SHARED_REPORTS_KEY, []);
  const report = reports.find((item) => item.token === token) || null;
  const expired = report?.expiresAt ? new Date(report.expiresAt).getTime() < Date.now() : false;

  const cards = useMemo(() => [
    { icon: Flame, label: 'Calories', value: '7-day pattern', detail: 'Consumed vs goal trend' },
    { icon: Utensils, label: 'Macros', value: 'Protein • Carbs • Fats', detail: 'Balance and consistency' },
    { icon: Droplets, label: 'Water', value: 'Hydration summary', detail: 'Daily water entries' },
    { icon: Scale, label: 'BMI / Weight', value: 'Progress view', detail: 'User-entered wellness data' },
  ], []);

  return <main className="page-wrap shared-report-page">
    <section className="card shared-report-hero">
      <div className="shared-report-lock"><LockKeyhole /></div>
      <p className="eyebrow">Read-only professional report</p>
      <h1>{report ? `${report.profileName}'s nutrition summary` : 'Shared nutrition report'}</h1>
      <p className="micro">This view is designed for doctors and dietitians to review wellness tracking information only. Eatlyte does not diagnose, treat, or replace clinical care.</p>
      <div className="shared-report-meta">
        <span>{report ? `Recipient: ${report.recipientEmail}` : 'Private link'}</span>
        <span>{report ? `Expires: ${new Date(report.expiresAt).toLocaleDateString()}` : 'Time-limited access'}</span>
        <span>Read-only</span>
      </div>
    </section>

    {expired ? <section className="card p-6"><h2 className="section-title">This report link expired</h2><p className="micro mt-2">Ask the Eatlyte user to generate a new doctor/dietitian report link.</p></section> : <>
      <section className="shared-report-grid">
        {cards.map((card) => <article className="card shared-report-card" key={card.label}><card.icon /><span>{card.label}</span><b>{card.value}</b><p>{card.detail}</p></article>)}
      </section>
      <section className="card shared-report-detail">
        <div className="flex items-start gap-3"><FileText className="mt-1 h-6 w-6"/><div><h2 className="section-title">What professionals should review</h2><p className="micro mt-2">Meal consistency, protein adequacy, fiber intake, high sugar or sodium patterns, hydration, and weight/BMI trend. Any medical interpretation should be done by a licensed professional with the user’s full health context.</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-4 ring-1 ring-[var(--nf-border)]"><b>Nutrition</b><p className="micro mt-1">Calories, macros, fiber, sugar and sodium.</p></div>
          <div className="rounded-3xl bg-white p-4 ring-1 ring-[var(--nf-border)]"><b>Habits</b><p className="micro mt-1">Water, exercise and weekly consistency.</p></div>
          <div className="rounded-3xl bg-white p-4 ring-1 ring-[var(--nf-border)]"><b>Notes</b><p className="micro mt-1">User-entered context and questions for review.</p></div>
        </div>
      </section>
    </>}
  </main>;
}
