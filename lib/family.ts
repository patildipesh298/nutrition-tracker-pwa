import { id } from './storage';

export type FamilyRole = 'member' | 'caregiver' | 'elder' | 'doctor' | 'dietitian';
export type InviteStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';

export type FamilyInvite = {
  id: string;
  email: string;
  role: FamilyRole;
  status: InviteStatus;
  token: string;
  invitedByName?: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
};

export type ManagedProfile = {
  id: string;
  name: string;
  relationship: string;
  age?: number;
  focus: string;
  notes?: string;
  assignedRole?: FamilyRole;
  createdAt: string;
};

export type SharedReport = {
  id: string;
  recipientEmail: string;
  recipientRole: 'doctor' | 'dietitian';
  profileName: string;
  sections: string[];
  status: 'active' | 'sent' | 'expired' | 'revoked';
  token: string;
  createdAt: string;
  expiresAt: string;
};

export const FAMILY_INVITES_KEY = 'eatlyte_family_invites_v2';
export const MANAGED_PROFILES_KEY = 'eatlyte_managed_profiles_v2';
export const SHARED_REPORTS_KEY = 'eatlyte_shared_reports_v2';
export const PENDING_INVITE_KEY = 'eatlyte_pending_invite_v2';

export const roleConfig: Record<FamilyRole, { label: string; short: string; description: string; permissions: string[]; bestFor: string; cta: string }> = {
  member: {
    label: 'Family Member',
    short: 'Tracks own nutrition',
    description: 'For spouse, sibling, adult child, or anyone who will use Eatlyte for their own meals and progress.',
    permissions: ['Track own food, water and exercise', 'View own dashboard and progress', 'Optionally share summary with group owner'],
    bestFor: 'Spouse, sibling, adult child, roommate',
    cta: 'Track my own nutrition',
  },
  caregiver: {
    label: 'Caregiver',
    short: 'Helps someone else',
    description: 'For a person helping a child, elder, parent, or dependent stay consistent with meals, water and reminders.',
    permissions: ['Log meals and water for assigned profiles', 'View daily nutrition summary', 'See gentle alerts for low protein, low fiber, high sugar or low water'],
    bestFor: 'Parent, caretaker, nurse, spouse helping an elder',
    cta: 'Help manage someone else',
  },
  elder: {
    label: 'Elder / Managed Member',
    short: 'Can be managed by caregiver',
    description: 'For an elder or dependent who may use the app directly or be managed by a trusted family caregiver.',
    permissions: ['Own profile with age-aware goals', 'Can be linked to caregiver', 'Can receive simple reminders and summary views'],
    bestFor: 'Parent, grandparent, dependent adult',
    cta: 'Create or join as managed member',
  },
  doctor: {
    label: 'Doctor Viewer',
    short: 'Read-only report access',
    description: 'For a physician reviewing nutrition and wellness summaries. This is not a medical-care workflow.',
    permissions: ['Read-only 7/30-day report', 'View food, macros, water, BMI and notes', 'Cannot edit meals or family data', 'Access expires automatically'],
    bestFor: 'Primary-care doctor, specialist, clinic reviewer',
    cta: 'View shared nutrition report',
  },
  dietitian: {
    label: 'Dietitian Viewer',
    short: 'Read-only nutrition review',
    description: 'For a registered dietitian or nutrition coach reviewing meal quality and macro/micronutrient patterns.',
    permissions: ['Read-only report access', 'View meal patterns and nutrient gaps', 'Cannot edit user data', 'Access expires automatically'],
    bestFor: 'Dietitian, nutrition coach, wellness professional',
    cta: 'Review shared nutrition report',
  },
};

export const inviteRoleOptions = Object.entries(roleConfig).map(([value, config]) => ({ value: value as FamilyRole, ...config }));

export function makeToken(prefix = 'etl') {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : id();
  return `${prefix}_${random.replace(/-/g, '')}`;
}

export function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function isExpired(expiresAt?: string) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

export function roleLabel(role: FamilyRole | string) {
  return roleConfig[role as FamilyRole]?.label || 'Family Member';
}

export function rolePath(role: FamilyRole | string) {
  if (role === 'doctor' || role === 'dietitian') return '/shared-report';
  if (role === 'caregiver' || role === 'elder') return '/family';
  return '/dashboard';
}
