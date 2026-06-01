export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import FoodClient from '@/components/FoodClient';
export default function Page(){return <Suspense fallback={<div className="page-wrap"><div className="card p-5">Loading food logger...</div></div>}><FoodClient/></Suspense>}
