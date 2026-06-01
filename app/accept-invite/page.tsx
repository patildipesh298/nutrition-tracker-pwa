import { Suspense } from 'react';
import AcceptInviteClient from '@/components/AcceptInviteClient';

export default function AcceptInvitePage() {
  return <Suspense fallback={<main className="page-wrap"><section className="card p-6">Loading invite...</section></main>}><AcceptInviteClient /></Suspense>;
}
