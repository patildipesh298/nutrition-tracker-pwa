import { Suspense } from 'react';
import SharedReportClient from '@/components/SharedReportClient';

export default function SharedReportPage() {
  return <Suspense fallback={<main className="page-wrap"><section className="card p-6">Loading shared report...</section></main>}><SharedReportClient /></Suspense>;
}
