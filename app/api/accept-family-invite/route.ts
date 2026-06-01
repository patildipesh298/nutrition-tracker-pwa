import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { FamilyRole, roleConfig } from '@/lib/family';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const role = (String(body.role || 'member').toLowerCase() in roleConfig ? String(body.role || 'member').toLowerCase() : 'member') as FamilyRole;
    const acceptedBy = String(body.acceptedBy || body.email || '').trim().toLowerCase();
    if (!token) return NextResponse.json({ success: false, error: 'Invite token is required.' }, { status: 400 });

    const admin = getSupabaseAdmin();
    if (admin) {
      const { data: invite } = await admin.from('family_invites').select('*').eq('token', token).maybeSingle();
      if (invite?.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        await admin.from('family_invites').update({ status: 'expired' }).eq('token', token);
        return NextResponse.json({ success: false, error: 'This invite has expired. Ask for a new invite.' }, { status: 410 });
      }
      await admin.from('family_invites').update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by_email: acceptedBy || null }).eq('token', token);
      try { await admin.from('access_audit_logs').insert({ event_type: 'family_invite_accepted', actor_email: acceptedBy || null, target_type: 'family_invite', target_token: token, metadata: { role } }); } catch {}
    }

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Could not accept invite.' }, { status: 500 });
  }
}
