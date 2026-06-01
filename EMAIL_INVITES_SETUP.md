# Eatlyte Invite Email Setup

Eatlyte supports two production email providers for family invites:

1. **Resend** (recommended for Vercel/Next.js simplicity)
2. **SendGrid through Google Cloud Marketplace / Google Cloud setup**

The app route is:

```txt
POST /api/invite-family
```

It reads:

```env
EMAIL_PROVIDER=resend # or sendgrid
INVITE_FROM_EMAIL=Eatlyte <hello@eatlyte.app>
RESEND_API_KEY=
SENDGRID_API_KEY=
NEXT_PUBLIC_APP_URL=https://eatlyte.app
```

---

## Option A — Resend setup

### 1. Create a Resend account
Go to:

```txt
https://resend.com
```

### 2. Add your sending domain
Use a subdomain for production email, for example:

```txt
mail.eatlyte.app
```

This protects your root domain reputation and makes DNS easier to manage.

### 3. Add DNS records in Cloudflare
In Resend dashboard, open the domain and copy all required DNS records.
Usually you will add SPF and DKIM records. Resend explains that SPF authorizes sending IPs and DKIM verifies authenticity.

Cloudflare path:

```txt
Cloudflare → eatlyte.app → DNS → Records → Add record
```

Add every record exactly as Resend shows.

Use **DNS only** unless Resend specifically says otherwise.

### 4. Verify domain in Resend
Go back to Resend and click **Verify DNS records**.

### 5. Create API key
Create an API key in Resend and add this in Vercel:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxx
INVITE_FROM_EMAIL=Eatlyte <hello@eatlyte.app>
NEXT_PUBLIC_APP_URL=https://eatlyte.app
```

### 6. Redeploy Vercel
Redeploy once after adding env vars.

### 7. Test in app
Open:

```txt
/family
```

Send an invite to a Gmail address you control.
Check Inbox, Promotions, and Spam.

---

## Option B — Google Cloud / SendGrid setup

Google Cloud commonly recommends using a third-party email provider such as SendGrid, Mailgun, or Mailjet for application email.

### 1. Create SendGrid account
You can use SendGrid directly or through Google Cloud Marketplace.

### 2. Authenticate sender domain
Authenticate:

```txt
eatlyte.app
```

or better:

```txt
mail.eatlyte.app
```

SendGrid will give you DNS records. Add those in Cloudflare.

### 3. Create SendGrid API key
Create a restricted API key with mail-send permission.

### 4. Add env vars in Vercel

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxx
INVITE_FROM_EMAIL=Eatlyte <hello@eatlyte.app>
NEXT_PUBLIC_APP_URL=https://eatlyte.app
```

### 5. Redeploy and test
Open `/family` and send a test invite.

---

## Production deliverability checklist

- Use a real sender: `hello@eatlyte.app`
- Verify SPF/DKIM records
- Add DMARC in Cloudflare:

```txt
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:hello@eatlyte.app
```

- Do not send high volume before warming the domain
- Add unsubscribe only if you later send marketing emails
- Keep invite emails transactional and clear
