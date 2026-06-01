'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  HeartHandshake,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Trophy,
  UserRoundCog,
  Users,
} from 'lucide-react';
import PageHeader from './PageHeader';
import { readLS, toast, writeLS } from '@/lib/storage';
import type { ExerciseLog, MealLog, VitalLog } from '@/lib/types';
import { achievementBadges, engagementSummary, familyConversationStarters, familyMissions } from '@/lib/engagement';
import {
  daysFromNow,
  FamilyInvite,
  FamilyRole,
  FAMILY_INVITES_KEY,
  inviteRoleOptions,
  isExpired,
  makeToken,
  ManagedProfile,
  MANAGED_PROFILES_KEY,
  roleConfig,
  SharedReport,
  SHARED_REPORTS_KEY,
} from '@/lib/family';

const roleIcons: Record<FamilyRole, any> = {
  member: Users,
  caregiver: HeartHandshake,
  elder: UserRoundCog,
  doctor: Stethoscope,
  dietitian: ShieldCheck,
};

const reportSections = ['Calories', 'Macros', 'Fiber', 'Sugar/Sodium', 'Water', 'BMI/Weight', 'Food log notes'];

type Tab = 'overview' | 'together' | 'invites' | 'managed' | 'share';

export default function FamilyClient() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [email, setEmail] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [role, setRole] = useState<FamilyRole>('member');
  const [members, setMembers] = useState<FamilyInvite[]>([]);
  const [managedProfiles, setManagedProfiles] = useState<ManagedProfile[]>([]);
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);
  const [sending, setSending] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [age, setAge] = useState('');
  const [focus, setFocus] = useState('General wellness');
  const [notes, setNotes] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportRole, setReportRole] = useState<'doctor' | 'dietitian'>('doctor');
  const [reportProfile, setReportProfile] = useState('My profile');
  const [reportDays, setReportDays] = useState(30);
  const [sharing, setSharing] = useState(false);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);

  useEffect(() => {
    setMembers(readLS<FamilyInvite[]>(FAMILY_INVITES_KEY, []));
    setManagedProfiles(readLS<ManagedProfile[]>(MANAGED_PROFILES_KEY, []));
    setSharedReports(readLS<SharedReport[]>(SHARED_REPORTS_KEY, []));
    setMeals(readLS<MealLog[]>('foods', []));
    setVitals(readLS<VitalLog[]>('vitals', []));
    setExercises(readLS<ExerciseLog[]>('exercise_logs', []));
  }, []);

  const stats = useMemo(() => {
    const activeInvites = members.filter((m) => !isExpired(m.expiresAt) && m.status !== 'revoked').length;
    const proShares = sharedReports.filter((r) => !isExpired(r.expiresAt) && r.status !== 'revoked').length;
    return { activeInvites, managed: managedProfiles.length, proShares };
  }, [members, managedProfiles, sharedReports]);

  const familyQuestList = useMemo(() => familyMissions({
    meals,
    vitals,
    exercises,
    managedCount: managedProfiles.length,
    inviteCount: members.length,
  }), [meals, vitals, exercises, managedProfiles.length, members.length]);
  const familyQuestSummary = useMemo(() => engagementSummary(familyQuestList), [familyQuestList]);
  const familyBadges = useMemo(() => achievementBadges({
    allMeals: meals,
    vitals,
    exercises,
    managedCount: managedProfiles.length,
    inviteCount: members.length,
  }), [meals, vitals, exercises, managedProfiles.length, members.length]);
  const familyPrompts = useMemo(() => familyConversationStarters(managedProfiles.length), [managedProfiles.length]);
  const selectedRole = roleConfig[role];

  async function invite() {
    if (!email.includes('@')) return toast('Enter a valid email address.');
    setSending(true);
    const token = makeToken('invite');
    const expiresAt = daysFromNow(7);
    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://eatlyte.app'}/accept-invite?token=${encodeURIComponent(token)}&role=${role}&email=${encodeURIComponent(email.trim().toLowerCase())}`;
    try {
      const response = await fetch('/api/invite-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: inviteeName, role, token, expiresAt, inviteUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || 'Invite failed');
      const nextInvite: FamilyInvite = {
        id: data.inviteId || token,
        email: email.trim().toLowerCase(),
        role,
        status: 'sent',
        token,
        invitedByName: inviteeName,
        createdAt: new Date().toISOString(),
        expiresAt,
      };
      const next = [nextInvite, ...members];
      setMembers(next);
      writeLS(FAMILY_INVITES_KEY, next);
      setEmail('');
      setInviteeName('');
      toast(`${selectedRole.label} invite sent.`);
    } catch (e: any) {
      toast(e?.message || 'Invite could not be sent. Check Resend/SendGrid domain verification.');
    } finally {
      setSending(false);
    }
  }

  function addManagedProfile() {
    if (!profileName.trim()) return toast('Enter the person name first.');
    const profile: ManagedProfile = {
      id: makeToken('profile'),
      name: profileName.trim(),
      relationship,
      age: age ? Number(age) : undefined,
      focus,
      notes,
      assignedRole: 'caregiver',
      createdAt: new Date().toISOString(),
    };
    const next = [profile, ...managedProfiles];
    setManagedProfiles(next);
    writeLS(MANAGED_PROFILES_KEY, next);
    setProfileName('');
    setAge('');
    setNotes('');
    toast('Managed profile created.');
  }

  function removeManagedProfile(id: string) {
    const next = managedProfiles.filter((p) => p.id !== id);
    setManagedProfiles(next);
    writeLS(MANAGED_PROFILES_KEY, next);
    toast('Managed profile removed.');
  }

  async function createReportShare() {
    if (!reportEmail.includes('@')) return toast('Enter doctor or dietitian email first.');
    setSharing(true);
    const token = makeToken('report');
    const expiresAt = daysFromNow(reportDays);
    const reportUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://eatlyte.app'}/shared-report?token=${encodeURIComponent(token)}`;
    const report: SharedReport = {
      id: token,
      recipientEmail: reportEmail.trim().toLowerCase(),
      recipientRole: reportRole,
      profileName: reportProfile || 'My profile',
      sections: reportSections,
      status: 'sent',
      token,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    try {
      const response = await fetch('/api/share-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...report, reportUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || 'Report share failed');
      const next = [report, ...sharedReports];
      setSharedReports(next);
      writeLS(SHARED_REPORTS_KEY, next);
      setReportEmail('');
      toast(`Read-only report sent to ${reportRole}.`);
    } catch (error: any) {
      toast(error?.message || 'Could not send report. Check email provider settings.');
    } finally {
      setSharing(false);
    }
  }

  function copyInviteLink(invite: FamilyInvite) {
    const url = `${window.location.origin}/accept-invite?token=${encodeURIComponent(invite.token)}&role=${invite.role}&email=${encodeURIComponent(invite.email)}`;
    navigator.clipboard?.writeText(url);
    toast('Invite link copied.');
  }

  function revokeInvite(id: string) {
    const next = members.map((m) => m.id === id ? { ...m, status: 'revoked' as const } : m);
    setMembers(next);
    writeLS(FAMILY_INVITES_KEY, next);
    toast('Invite revoked.');
  }

  return <div className="page-wrap family-page"><PageHeader title="Family Wellness" subtitle="Invite family, assign caregiver roles, create managed elder profiles, and share read-only nutrition reports with professionals." />
    <section className="family-hero card">
      <div>
        <p className="eyebrow">Private by default</p>
        <h1>Care together without making the app complicated.</h1>
        <p>Start with simple role-based access. Family members track themselves, caregivers help assigned profiles, and doctors or dietitians only receive time-limited read-only reports.</p>
      </div>
      <div className="family-stat-grid">
        <span><b>{stats.activeInvites}</b><small>active invites</small></span>
        <span><b>{stats.managed}</b><small>managed profiles</small></span>
        <span><b>{stats.proShares}</b><small>report shares</small></span>
      </div>
    </section>

    <section className="family-tabs" aria-label="Family sections">
      {(['overview', 'together', 'invites', 'managed', 'share'] as Tab[]).map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab === 'share' ? 'Doctor Share' : tab === 'together' ? 'Together' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
    </section>

    {activeTab === 'overview' ? <>
      <section className="role-grid">
        {inviteRoleOptions.map((option) => {
          const Icon = roleIcons[option.value];
          return <article className="card role-card" key={option.value} onClick={() => { setRole(option.value); setActiveTab('invites'); }}><Icon /><span>{option.label}</span><b>{option.short}</b><p>{option.description}</p><small>Best for: {option.bestFor}</small></article>;
        })}
      </section>
      <section className="card caregiver-board">
        <div><p className="eyebrow">Caregiver workflow</p><h2 className="section-title">What happens after invite acceptance?</h2><p className="micro mt-2">The invited person chooses whether they will track their own nutrition, help manage someone else, or view a read-only professional report.</p></div>
        <div className="care-steps">
          <span><CheckCircle2 /> Accept invite</span><span><Users /> Choose role</span><span><UserRoundCog /> Select profile</span><span><Activity /> Track or review</span>
        </div>
      </section>
      <section className="family-fun-preview card p-5">
        <div>
          <p className="eyebrow">Family engagement</p>
          <h2 className="section-title">Make healthy routines feel like small family wins.</h2>
          <p className="micro mt-2">Use quests, badges and conversation prompts to keep everyone involved without making nutrition stressful.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('together')}><Trophy className="h-4 w-4" /> Open Together board</button>
      </section>
    </> : null}

    {activeTab === 'together' ? <section className="family-together-grid">
      <article className="family-score-card card p-5">
        <div className="points-orb large"><Trophy /><b>{familyQuestSummary.earned}</b><span>family points</span></div>
        <div><p className="eyebrow">Today together</p><h2 className="section-title">{familyQuestSummary.label}</h2><p className="micro mt-2">Points reward consistency, hydration, movement and care setup — not weight loss or restriction.</p></div>
      </article>
      <article className="card p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Family missions</p><h2 className="section-title">Complete simple actions</h2></div><Sparkles className="h-7 w-7 text-orange-700" /></div>
        <div className="family-mission-list mt-4">
          {familyQuestList.map((mission) => <a href={mission.href} key={mission.id} className={`mission-row ${mission.tone}`}><span>{mission.icon}</span><div><b>{mission.title}</b><p>{mission.description}</p><i><em style={{ width: `${mission.progress}%` }} /></i></div><small>{mission.done ? `+${mission.points}` : `${mission.progress}%`}</small></a>)}
        </div>
      </article>
      <article className="card p-5">
        <div className="flex items-center gap-3"><Gift className="h-7 w-7 text-orange-700" /><div><p className="eyebrow">Badges</p><h2 className="section-title">Unlock care milestones</h2></div></div>
        <div className="family-badge-grid mt-4">{familyBadges.map((badge) => <div key={badge.id} className={badge.unlocked ? 'unlocked' : ''}><span>{badge.icon}</span><b>{badge.label}</b><small>{badge.detail}</small></div>)}</div>
      </article>
      <article className="card p-5">
        <div className="flex items-center gap-3"><HeartHandshake className="h-7 w-7 text-orange-700" /><div><p className="eyebrow">Conversation starters</p><h2 className="section-title">Quick family check-ins</h2></div></div>
        <div className="conversation-list mt-4">{familyPrompts.map((prompt) => <button key={prompt} onClick={() => { navigator.clipboard?.writeText(prompt); toast('Prompt copied.'); }}>{prompt}</button>)}</div>
        <p className="micro mt-3">These prompts are designed for support and awareness, not judgment.</p>
      </article>
    </section> : null}

    {activeTab === 'invites' ? <section className="family-layout">
      <article className="card p-5">
        <h2 className="section-title">Send role-based invite</h2>
        <p className="micro mt-1">Choose the right role so the next screen is easy for the invited person.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="input" value={inviteeName} onChange={e => setInviteeName(e.target.value)} placeholder="Name optional" />
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select className="input" value={role} onChange={e => setRole(e.target.value as FamilyRole)}>{inviteRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <button className="btn btn-primary" disabled={sending} onClick={invite}><Mail className="h-4 w-4" />{sending ? 'Sending...' : 'Send invite'}</button>
        </div>
        <div className="selected-role-note"><b>{selectedRole.label}</b><p>{selectedRole.description}</p>{selectedRole.permissions.map((permission) => <span key={permission}><CheckCircle2 /> {permission}</span>)}</div>
      </article>
      <article className="card p-5">
        <h2 className="section-title">Invite status</h2>
        <div className="mt-4 space-y-3">{members.length === 0 ? <p className="micro">No invites yet.</p> : members.map((invite) => {
          const Icon = roleIcons[invite.role] || Users;
          const expired = isExpired(invite.expiresAt);
          return <div key={invite.id} className="invite-row"><Icon /><div><b>{invite.email}</b><p>{roleConfig[invite.role]?.label} · {expired ? 'expired' : invite.status} · expires {new Date(invite.expiresAt).toLocaleDateString()}</p></div><button onClick={() => copyInviteLink(invite)} title="Copy invite link"><Copy /></button><button onClick={() => revokeInvite(invite.id)} title="Revoke"><Trash2 /></button></div>;
        })}</div>
      </article>
    </section> : null}

    {activeTab === 'managed' ? <section className="family-layout">
      <article className="card p-5">
        <h2 className="section-title">Create managed profile</h2>
        <p className="micro mt-1">Use this when an elder, child, or dependent does not want to manage the app directly.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Dad, Mom, Child name"/><input className="input" value={age} onChange={e => setAge(e.target.value)} placeholder="Age optional" type="number"/></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><select className="input" value={relationship} onChange={e => setRelationship(e.target.value)}><option>Parent</option><option>Grandparent</option><option>Child</option><option>Spouse</option><option>Other dependent</option></select><select className="input" value={focus} onChange={e => setFocus(e.target.value)}><option>General wellness</option><option>Protein consistency</option><option>Hydration</option><option>Low sugar awareness</option><option>Low sodium awareness</option><option>Weight maintenance</option></select></div>
        <textarea className="input mt-3 min-h-24" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes: food preferences, allergies, reminders, caregiver instructions" />
        <button className="btn btn-primary mt-3" onClick={addManagedProfile}><Plus className="h-4 w-4" /> Add managed profile</button>
      </article>
      <article className="card p-5">
        <h2 className="section-title">Managed profiles</h2>
        <div className="mt-4 space-y-3">{managedProfiles.length === 0 ? <p className="micro">No managed profiles yet.</p> : managedProfiles.map((profile) => <div key={profile.id} className="managed-row"><UserRoundCog /><div><b>{profile.name}</b><p>{profile.relationship}{profile.age ? ` · ${profile.age} yrs` : ''} · {profile.focus}</p>{profile.notes ? <small>{profile.notes}</small> : null}</div><button onClick={() => removeManagedProfile(profile.id)}><Trash2 /></button></div>)}</div>
      </article>
    </section> : null}

    {activeTab === 'share' ? <section className="family-layout">
      <article className="card p-5">
        <h2 className="section-title">Share with doctor or dietitian</h2>
        <p className="micro mt-1">Generate a read-only, time-limited report link. This is safer than adding a professional to your family group.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input" value={reportEmail} onChange={e => setReportEmail(e.target.value)} placeholder="doctor@example.com"/><select className="input" value={reportRole} onChange={e => setReportRole(e.target.value as 'doctor' | 'dietitian')}><option value="doctor">Doctor Viewer</option><option value="dietitian">Dietitian Viewer</option></select></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><select className="input" value={reportProfile} onChange={e => setReportProfile(e.target.value)}><option>My profile</option>{managedProfiles.map((profile) => <option key={profile.id}>{profile.name}</option>)}</select><select className="input" value={reportDays} onChange={e => setReportDays(Number(e.target.value))}><option value={7}>Expires in 7 days</option><option value={30}>Expires in 30 days</option><option value={60}>Expires in 60 days</option></select></div>
        <div className="report-section-list">{reportSections.map((section) => <span key={section}><CheckCircle2 /> {section}</span>)}</div>
        <button className="btn btn-primary mt-4" disabled={sharing} onClick={createReportShare}><Stethoscope className="h-4 w-4" />{sharing ? 'Sending...' : 'Send read-only report'}</button>
      </article>
      <article className="card p-5">
        <h2 className="section-title">Shared reports</h2>
        <div className="mt-4 space-y-3">{sharedReports.length === 0 ? <p className="micro">No professional report links yet.</p> : sharedReports.map((report) => <div key={report.id} className="report-row"><CalendarClock /><div><b>{report.recipientEmail}</b><p>{report.recipientRole} · {isExpired(report.expiresAt) ? 'expired' : report.status} · expires {new Date(report.expiresAt).toLocaleDateString()}</p><small>{report.profileName} · Read-only</small></div></div>)}</div>
      </article>
    </section> : null}
  </div>;
}
