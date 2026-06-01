export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import ProfileClient from '@/components/ProfileClient';
export default function Page(){return <Suspense fallback={<div className="page-wrap"><div className="card p-5">Loading profile...</div></div>}><ProfileClient/></Suspense>}
