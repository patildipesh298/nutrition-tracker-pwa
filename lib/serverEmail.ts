export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function senderEmail() {
  return process.env.INVITE_FROM_EMAIL || 'Eatlyte <hello@mail.eatlyte.app>';
}

export async function sendTransactionalEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const provider = String(process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
  const from = senderEmail();
  if (provider === 'sendgrid') return sendWithSendGrid({ from, to, subject, html });
  return sendWithResend({ from, to, subject, html });
}

async function sendWithResend({ from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is missing. Add it in Vercel Environment Variables.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || result?.error || 'Resend failed to send the email. Verify your sender domain and From address.');
  return { provider: 'resend', result };
}

async function sendWithSendGrid({ from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('SENDGRID_API_KEY is missing. Add it in Vercel Environment Variables.');
  const fromEmail = from.match(/<([^>]+)>/)?.[1] || from;
  const fromName = from.includes('<') ? from.split('<')[0].trim() : 'Eatlyte';
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName || 'Eatlyte' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'SendGrid failed to send the email. Verify your sender domain.');
  }
  return { provider: 'sendgrid', result: { accepted: true } };
}
