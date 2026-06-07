import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { FamilyRole, roleConfig } from '@/lib/family';

function asRole(value: unknown): FamilyRole {
  const v = String(value || 'member').toLowerCase();
  return (v in roleConfig ? v : 'member') as FamilyRole;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    // The client-supplied role is only a hint; the authoritative role always comes from the
    // stored invite so an invitee can never escalate themselves to caregiver/doctor/dietitian.
    const requestedRole = asRole(body.role);
    const acceptedBy = String(body.acceptedBy || body.email || '').trim().toLowerCase();
    if (!token) return NextResponse.json({ success: false, error: 'Invite token is required.' }, { status: 400 });

    const admin = getSupabaseAdmin();
    let role: FamilyRole = 'member';
    let verified = false;

    if (admin) {
      const { data: invite } = await admin.from('family_invites').select('*').eq('token', token).maybeSingle();
      if (!invite) {
        // No server record for this token: never grant a privileged role on an unverifiable invite.
        return NextResponse.json({ success: false, error: 'This invite link is no longer valid. Ask for a new invite.' }, { status: 404 });
      }
      if (invite.status === 'revoked') {
        return NextResponse.json({ success: false, error: 'This invite was revoked by the family owner.' }, { status: 403 });
      }
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        await admin.from('family_invites').update({ status: 'expired' }).eq('token', token);
        return NextResponse.json({ success: false, error: 'This invite has expired. Ask for a new invite.' }, { status: 410 });
      }
      // Optional safeguard: if the invite was addressed to a specific email, the accepting
      // account should match it (when we know who is accepting).
      if (invite.email && acceptedBy && String(invite.email).toLowerCase() !== acceptedBy) {
        return NextResponse.json({ success: false, error: 'This invite was sent to a different email address.' }, { status: 403 });
      }
      role = asRole(invite.role);
      verified = true;
      await admin.from('family_invites').update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by_email: acceptedBy || null }).eq('token', token);
      try { await admin.from('access_audit_logs').insert({ event_type: 'family_invite_accepted', actor_email: acceptedBy || null, target_type: 'family_invite', target_token: token, metadata: { role } }); } catch {}
    } else {
      // Local-only mode (no service-role key configured): role is used purely for client routing,
      // there is no server-side access being granted, so the sanitized hint is acceptable here.
      role = requestedRole;
    }

    return NextResponse.json({ success: true, role, verified });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Could not accept invite.' }, { status: 500 });
  }
}
