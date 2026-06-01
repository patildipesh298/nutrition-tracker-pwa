import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isEmail, sendTransactionalEmail } from '@/lib/serverEmail';
import { daysFromNow, FamilyRole, makeToken, roleConfig } from '@/lib/family';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char] || char));
}

function inviteTemplate({ name, inviteUrl, role, expiresAt }: { name: string; inviteUrl: string; role: FamilyRole; expiresAt: string }) {
  const config = roleConfig[role] || roleConfig.member;
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1f1b16;max-width:640px;margin:0 auto;padding:28px;background:#fffdf8">
      <div style="border:1px solid #eadfce;border-radius:28px;padding:28px;background:#ffffff;box-shadow:0 18px 48px rgba(37,30,21,.08)">
        <div style="display:inline-block;background:#fff2e2;color:#111318;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Eatlyte Family Invite</div>
        <h1 style="margin:18px 0 8px;font-size:30px;line-height:1.08;color:#111318">${escapeHtml(config.cta)}</h1>
        <p style="margin:0 0 18px;color:#746b61;font-weight:600">${escapeHtml(name || 'A family member')} invited you to join Eatlyte as <b>${escapeHtml(config.label)}</b>.</p>
        <div style="border:1px solid #eadfce;border-radius:20px;padding:16px;margin:18px 0;background:#fffaf2">
          <p style="margin:0 0 8px;color:#111318;font-weight:800">What this role can do</p>
          <ul style="margin:0;padding-left:18px;color:#746b61;font-size:14px">${config.permissions.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </div>
        <a href="${inviteUrl}" style="background:#111318;color:white;padding:14px 18px;border-radius:16px;text-decoration:none;font-weight:800;display:inline-block">Accept invitation</a>
        <p style="font-size:13px;color:#746b61;margin-top:20px">This invite expires on ${new Date(expiresAt).toLocaleDateString('en-US')}.</p>
        <p style="font-size:12px;color:#8b8177;margin-top:18px">Eatlyte provides general wellness guidance only and does not replace a licensed doctor or registered dietitian.</p>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const role = (String(body.role || 'member').toLowerCase() in roleConfig ? String(body.role || 'member').toLowerCase() : 'member') as FamilyRole;
    const token = String(body.token || makeToken('invite'));
    const expiresAt = String(body.expiresAt || daysFromNow(7));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://eatlyte.app';
    const inviteUrl = String(body.inviteUrl || `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}&role=${role}&email=${encodeURIComponent(email)}`);
    if (!email || !isEmail(email)) return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });

    let inviteId = token;
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data, error } = await admin.from('family_invites').insert({
        email,
        role,
        token,
        status: 'pending',
        invite_url: inviteUrl,
        invited_name: name || null,
        expires_at: expiresAt,
      }).select('id').maybeSingle();
      if (!error && data?.id) inviteId = data.id;
    }

    const subject = `You are invited to Eatlyte as ${roleConfig[role].label}`;
    const html = inviteTemplate({ name, inviteUrl, role, expiresAt });
    const result = await sendTransactionalEmail({ to: email, subject, html });

    if (admin) {
      await admin.from('family_invites').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('token', token);
    }

    return NextResponse.json({ success: true, inviteId, token, expiresAt, inviteUrl, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected invite error.' }, { status: 500 });
  }
}
