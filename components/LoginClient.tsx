'use client';
import {useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import {toast} from '@/lib/storage';
import {getSupabase} from '@/lib/supabaseClient';
import {fetchProfileStatus} from '@/lib/supabaseData';

export default function Login(){
  const router=useRouter();
  const searchParams=useSearchParams();
  const inviteToken=searchParams.get('invite') || '';
  const inviteRole=searchParams.get('role') || 'member';
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [mode,setMode]=useState<'signin'|'signup'>('signin');
  const [loading,setLoading]=useState(false);

  async function routeAfterAuth(){
    try{
      const status=await fetchProfileStatus();
      if(inviteToken){ router.replace(`/accept-invite?token=${encodeURIComponent(inviteToken)}&role=${encodeURIComponent(inviteRole)}`); return; }
      router.replace(status.hasProfile?'/dashboard':'/profile?new=1');
    }catch{ router.replace('/dashboard'); }
  }

  async function submit(){
    const sb=getSupabase();
    if(!sb){toast('Supabase env keys missing. Add them in Vercel.');return}
    setLoading(true);
    try{
      if(mode==='signin'){
        const {error}=await sb.auth.signInWithPassword({email,password});
        if(error)return toast(error.message);
        toast('Login successful');
        await routeAfterAuth();
      }else{
        const {error}=await sb.auth.signUp({email,password,options:{emailRedirectTo: inviteToken ? `${location.origin}/accept-invite?token=${encodeURIComponent(inviteToken)}&role=${encodeURIComponent(inviteRole)}` : `${location.origin}/profile?new=1`}});
        if(error)return toast(error.message);
        toast('Account created. Please create your profile.');
        router.replace(inviteToken ? `/accept-invite?token=${encodeURIComponent(inviteToken)}&role=${encodeURIComponent(inviteRole)}` : '/profile?new=1');
      }
    }finally{setLoading(false)}
  }

  async function google(){
    const sb=getSupabase();
    if(!sb)return toast('Supabase env keys missing.');
    await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo: inviteToken ? `${location.origin}/accept-invite?token=${encodeURIComponent(inviteToken)}&role=${encodeURIComponent(inviteRole)}` : `${location.origin}/dashboard`}})
  }

  return <div className="page-wrap"><PageHeader title="Login / Signup" subtitle="Existing users land on Home. New users create a profile once."/><section className="card mx-auto max-w-md p-5"><div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1"><button className={`rounded-xl py-2 font-bold ${mode==='signin'?'bg-white shadow-sm':''}`} onClick={()=>setMode('signin')}>Sign in</button><button className={`rounded-xl py-2 font-bold ${mode==='signup'?'bg-white shadow-sm':''}`} onClick={()=>setMode('signup')}>Sign up</button></div><input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="input mt-3" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="btn btn-primary mt-4 w-full" disabled={loading} onClick={submit}>{loading?'Please wait...':mode==='signin'?'Sign in':'Create account'}</button><button className="btn btn-soft mt-3 w-full" onClick={google}>Continue with Google</button><p className="micro mt-4">Profile is required only once for first-time users.</p></section></div>
}
