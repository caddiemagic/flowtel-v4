# Supabase Auth Email Setup — Flowtel

Use this checklist before calling the v0.10.85 beta-exit authentication flow live.

## Goal

Flowtel uses Supabase Auth for:

- first-time account email confirmation;
- Forgot Password / password recovery;
- Event Pass email confirmation and recovery.

The browser code is already wired. Production email delivery still needs to be configured in the Supabase project.

## 1. Choose an SMTP provider

Use a transactional email provider that supports SMTP (for example Resend, Postmark, SendGrid, AWS SES, Brevo, or another SMTP provider).

Create/verify a Flowtel sending domain and sender such as:

`no-reply@theflowtel.com`

Collect:

- SMTP host
- SMTP port
- SMTP username
- SMTP password
- From email
- Sender name (recommended: `The Flowtel`)

## 2. Configure Custom SMTP in Supabase

In the Supabase Dashboard for the Flowtel project:

1. Open **Authentication**.
2. Open **Settings** / **Email** (the exact dashboard grouping can change; Supabase documents this as the Authentication settings page).
3. Find and enable **Custom SMTP**.
4. Enter the provider host, port, username, password, From email, and sender name.
5. Save.

Do not place these SMTP credentials in browser JavaScript.

## 3. Configure production auth URLs

In **Authentication → URL Configuration**:

Set Site URL to:

`https://app.theflowtel.com`

Allow these production redirect destinations:

- `https://app.theflowtel.com/client/`
- `https://app.theflowtel.com/queendom-events/`

The code appends query parameters such as `passwordRecovery=1`, `accountConfirmed=1`, `claimEvent=...`, and `eventPassRecovery=1`; keep the canonical production paths allowed according to the Supabase redirect-URL configuration used by the project.

## 4. Enable real signup + confirmation

In the Email/Auth provider settings:

- allow email/password signup;
- enable **Confirm Email** for the beta-exit launch;
- keep automatic email confirmation OFF so possession of the inbox is actually verified.

Confirm Email is especially important for Event Passes because access can be matched to a paid Squarespace checkout email. Email confirmation proves control of that email before private event admission is checked.

## 5. Brand the email templates

In **Authentication → Email Templates**, customize at least:

- Confirm Signup
- Reset Password / Recovery

Keep Supabase's confirmation/recovery URL variables intact. Do not replace the secure confirmation URL with a plain Flowtel URL.

Suggested sender identity:

- Sender name: `The Flowtel`
- Sender address: `no-reply@theflowtel.com`

## 6. Test before member rollout

Use a non-admin email address and test:

1. New Queendom signup → confirmation email arrives → link returns to `/client/` → account enters normal arrival flow.
2. Forgot Password → recovery email arrives → link returns to `/client/?passwordRecovery=1` → new password can be saved → normal arrival resumes.
3. Event Pass signup → confirmation email arrives → link returns to `/queendom-events/?claimEvent=...` → paid ticket is verified after authentication.
4. Event Pass Forgot Password → recovery returns to `/queendom-events/?eventPassRecovery=1...` and does not try to open the member Suite.

Check Supabase Auth logs and the SMTP provider logs if delivery fails.

## 7. Recommended launch hardening

After Custom SMTP is working, review Supabase Auth rate limits and CAPTCHA/attack-protection options before opening first-time signup broadly. Keep Auth email separate from marketing email.
