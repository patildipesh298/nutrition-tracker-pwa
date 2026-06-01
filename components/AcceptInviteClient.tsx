'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, HeartHandshake, ShieldCheck, Stethoscope, UserRoundCog, Users } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { readLS, toast, writeLS } from '@/lib/storage';
import { FamilyInvite, FAMILY_INVITES_KEY, FamilyRole, PENDING_INVITE_KEY, roleConfig, rolePath } from '@/lib/family';

const roleIcons: Record<FamilyRole, any> = {
  member: Users,
  caregiver: HeartHandshake,
  elder: UserRoundCog,
  doctor: Stethoscope,
  dietitian: ShieldCheck,
};

function getInvite(token: string) {
  const local = readLS<FamilyInvite[]>(FAMILY_INVITES_KEY, []);
  return local.find((invite) => invite.token === token) || null;
}

export default function AcceptInviteClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const roleParam = (params.get('role') || 'member') as FamilyRole;
  const emailParam = params.get('email') || '';
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fromStorage = token ? getInvite(token) : null;
    setInvite(fromStorage || {
      id: token || 'shared-invite',
      email: emailParam,
      role: roleConfig[roleParam] ? roleParam : 'member',
      status: 'pending',
      token: token || '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    async function loadUser() {
      const sb = getSupabase();
      const { data } = sb ? await sb.auth.getUser() : { data: { user: null } as any };
      setUserEmail(data?.user?.email || '');
      setChecking(false);
    }
    loadUser();
  }, [token, roleParam, emailParam]);

  const role = invite?.role || roleParam || 'member';
  const config = roleConfig[role] || roleConfig.member;
  const Icon = roleIcons[role] || Users;
  const isProViewer = role === 'doctor' || role === 'dietitian';
  const expired = invite?.expiresAt ? new Date(invite.expiresAt).getTime() < Date.now() : false;

  const route = useMemo(() => rolePath(role), [role]);

  async function acceptInvite() {
    if (!invite || expired) return;
    setAccepting(true);
    try {
      const sb = getSupabase();
      const { data } = sb ? await sb.auth.getUser() : { data: { user: null } as any };
      if (!data?.user) {
        writeLS(PENDING_INVITE_KEY, { token: invite.token, role: invite.role, email: invite.email, acceptedAt: new Date().toISOString() });
        toast('Create an account or sign in to finish joining.');
        router.push(`/login?invite=${encodeURIComponent(invite.token)}&role=${invite.role}`);
        return;
      }

      await fetch('/api/accept-family-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite.token, role: invite.role, email: invite.email, acceptedBy: data.user.email }),
      }).catch(() => null);

      const invites = readLS<FamilyInvite[]>(FAMILY_INVITES_KEY, []);
      const next = invites.map((item) => item.token === invite.token ? { ...item, status: 'accepted' as const, acceptedAt: new Date().toISOString() } : item);
      writeLS(FAMILY_INVITES_KEY, next);
      writeLS(PENDING_INVITE_KEY, { token: invite.token, role: invite.role, email: invite.email, acceptedAt: new Date().toISOString() });
      toast('Invite accepted. Welcome to Eatlyte.');
      router.replace(route);
    } catch (error: any) {
      toast(error?.message || 'Could not accept invite. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  return <main className="page-wrap invite-accept-page">
    <section className="card invite-accept-card">
      <div className="invite-accept-icon"><Icon /></div>
      <p className="eyebrow">Eatlyte family invite</p>
      <h1>{isProViewer ? 'Review shared nutrition safely' : 'Join family nutrition tracking'}</h1>
      <p className="invite-lead">{config.description}</p>

      <div className="invite-role-panel">
        <div>
          <span>Selected role</span>
          <b>{config.label}</b>
          <small>{config.short}</small>
        </div>
        <div>
          <span>Access</span>
          <b>{isProViewer ? 'Read-only' : role === 'caregiver' ? 'Care support' : 'Personal tracking'}</b>
          <small>{invite?.expiresAt ? `Invite expires ${new Date(invite.expiresAt).toLocaleDateString()}` : 'Expires in 7 days'}</small>
        </div>
      </div>

      <div className="role-permission-list">
        {config.permissions.map((permission) => <p key={permission}><CheckCircle2 /> {permission}</p>)}
      </div>

      {expired ? <div className="invite-warning"><Clock /> This invite has expired. Ask the family owner to send a new invite.</div> : null}
      {checking ? <p className="micro">Checking your account...</p> : userEmail ? <p className="micro">You are signed in as <b>{userEmail}</b>.</p> : <p className="micro">You will sign in or create an account before joining. We only connect you after you accept.</p>}

      <button className="btn btn-primary w-full" disabled={accepting || expired} onClick={acceptInvite}>{accepting ? 'Accepting...' : config.cta}</button>
      <Link className="btn btn-ghost w-full" href="/">Back to Eatlyte</Link>
    </section>
  </main>;
}
