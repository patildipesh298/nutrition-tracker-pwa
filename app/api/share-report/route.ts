import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isEmail, sendTransactionalEmail } from '@/lib/serverEmail';
import { daysFromNow, makeToken } from '@/lib/family';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char] || char));
}

function reportTemplate({ reportUrl, profileName, recipientRole, expiresAt, sections }: { reportUrl: string; profileName: string; recipientRole: string; expiresAt: string; sections: string[] }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1f1b16;max-width:640px;margin:0 auto;padding:28px;background:#fffdf8">
      <div style="border:1px solid #eadfce;border-radius:28px;padding:28px;background:#ffffff;box-shadow:0 18px 48px rgba(37,30,21,.08)">
        <div style="display:inline-block;background:#fff2e2;color:#111318;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Read-only Eatlyte Report</div>
        <h1 style="margin:18px 0 8px;font-size:30px;line-height:1.08;color:#111318">Nutrition summary for ${escapeHtml(profileName)}</h1>
        <p style="margin:0 0 18px;color:#746b61;font-weight:600">A user shared a time-limited Eatlyte wellness report with you as a ${escapeHtml(recipientRole)}.</p>
        <div style="border:1px solid #eadfce;border-radius:20px;padding:16px;margin:18px 0;background:#fffaf2">
          <p style="margin:0 0 8px;color:#111318;font-weight:800">Included sections</p>
          <ul style="margin:0;padding-left:18px;color:#746b61;font-size:14px">${sections.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
        </div>
        <a href="${reportUrl}" style="background:#111318;color:white;padding:14px 18px;border-radius:16px;text-decoration:none;font-weight:800;display:inline-block">Open read-only report</a>
        <p style="font-size:13px;color:#746b61;margin-top:20px">This access expires on ${new Date(expiresAt).toLocaleDateString('en-US')} and can be revoked by the user.</p>
        <p style="font-size:12px;color:#8b8177;margin-top:18px">Eatlyte provides user-entered wellness tracking only. Clinical decisions should use professional judgment and verified records.</p>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recipientEmail = String(body.recipientEmail || body.email || '').trim().toLowerCase();
    const recipientRole = String(body.recipientRole || body.role || 'doctor').toLowerCase() === 'dietitian' ? 'dietitian' : 'doctor';
    const profileName = String(body.profileName || 'My profile');
    const token = String(body.token || makeToken('report'));
    const expiresAt = String(body.expiresAt || daysFromNow(30));
    const sections = Array.isArray(body.sections) ? body.sections.map(String) : ['Calories', 'Macros', 'Fiber', 'Sugar/Sodium', 'Water', 'BMI/Weight'];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://eatlyte.app';
    const reportUrl = String(body.reportUrl || `${baseUrl}/shared-report?token=${encodeURIComponent(token)}`);
    if (!isEmail(recipientEmail)) return NextResponse.json({ success: false, error: 'Please enter a valid doctor or dietitian email.' }, { status: 400 });

    const admin = getSupabaseAdmin();
    if (admin) {
      await admin.from('shared_reports').insert({ recipient_email: recipientEmail, recipient_role: recipientRole, profile_name: profileName, sections, token, report_url: reportUrl, status: 'sent', expires_at: expiresAt });
      try { await admin.from('access_audit_logs').insert({ event_type: 'shared_report_sent', actor_email: null, target_type: 'shared_report', target_token: token, metadata: { recipientEmail, recipientRole, profileName } }); } catch {}
    }

    const subject = `Read-only Eatlyte nutrition report for ${profileName}`;
    const html = reportTemplate({ reportUrl, profileName, recipientRole, expiresAt, sections });
    const result = await sendTransactionalEmail({ to: recipientEmail, subject, html });
    return NextResponse.json({ success: true, token, reportUrl, expiresAt, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Could not share report.' }, { status: 500 });
  }
}
