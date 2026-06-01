import { Suspense } from 'react';
import LoginClient from '@/components/LoginClient';

export default function LoginPage() {
  return <Suspense fallback={<main className="page-wrap"><section className="card p-6">Loading login...</section></main>}><LoginClient /></Suspense>;
}
