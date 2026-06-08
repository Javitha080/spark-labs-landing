# Cloudflare Email Setup Guide

This guide explains how to configure Cloudflare Email service for the Young Innovators Club application.

## Prerequisites

- A Cloudflare account
- Your domain added to Cloudflare (e.g., `yic-dharmapala.web.app`)
- Access to Supabase project settings

## Step 1: Configure Cloudflare Email Routing

1. **Log in to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Select your domain

2. **Enable Email Routing**
   - Navigate to **Email** → **Email Routing**
   - Click **Get Started**
   - Choose **Route to:** and configure your destination email address
   - Verify your email address

3. **Create API Token**
   - Go to **My Profile** (top right) → **API Tokens**
   - Click **Create Token**
   - Use the **Custom token** template
   - Configure permissions:
     - **Account** → **Email Routing** → **Edit**
     - **Zone** → **Zone** → **Read** (for the specific domain)
   - Under **Account Resources**, select your account
   - Create the token and **save it securely**

4. **Get Account ID**
   - Go to any domain in your Cloudflare dashboard
   - The Account ID is shown in the right sidebar
   - Copy this value

## Step 2: Configure Supabase Secrets

Add the following secrets to your Supabase project:

```bash
# Using Supabase CLI
supabase secrets set CLOUDFLARE_API_TOKEN="your-api-token-here"
supabase secrets set CLOUDFLARE_ACCOUNT_ID="your-account-id-here"
supabase secrets set CLOUDFLARE_EMAIL_DOMAIN="yic-dharmapala.web.app"
supabase secrets set ADMIN_EMAIL="admin@example.com"
```

Or via Supabase Dashboard:
1. Go to **Project Settings** → **Secrets**
2. Add each secret with the exact names above

## Step 3: Update Environment Variables (Optional)

For local development, add to `.env`:

```env
# Cloudflare Email Configuration
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_EMAIL_DOMAIN=yic-dharmapala.web.app
ADMIN_EMAIL=admin@example.com
```

## Step 4: Deploy Edge Functions

After configuring secrets, redeploy the edge functions:

```bash
# Deploy all functions
supabase functions deploy send-enrollment-notification
supabase functions deploy send-contact-message
supabase functions deploy send-enrollment-update
```

## Step 5: Verify Email Setup

1. **Test Contact Form**
   - Submit a test message via the contact form
   - Check admin email for notification
   - Check sender email for confirmation

2. **Test Enrollment Form**
   - Submit a test enrollment application
   - Verify admin receives notification
   - Verify student receives confirmation

3. **Test Admin Notifications**
   - Go to `/admin/notifications`
   - Send a test email to yourself
   - Verify delivery

## Troubleshooting

### Emails not sending

1. Check Supabase function logs:
   ```bash
   supabase functions logs send-enrollment-notification
   ```

2. Verify secrets are set correctly:
   ```bash
   supabase secrets list
   ```

3. Check Cloudflare Email Routing is enabled and configured

### API Token Issues

- Ensure the API token has `Account:Email Routing:Edit` permission
- Verify the token hasn't expired
- Check that the Account ID matches your Cloudflare account

### Domain Issues

- Ensure your domain is active in Cloudflare
- Verify Email Routing is enabled for the domain
- Check that the domain matches `CLOUDFLARE_EMAIL_DOMAIN` secret

## Email Templates

The following email templates are available:

1. **Enrollment Notification** (Admin)
   - Triggered when a student submits an enrollment form
   - Sent to `ADMIN_EMAIL`

2. **Enrollment Confirmation** (Student)
   - Confirmation email to the student
   - Welcome message with next steps

3. **Contact Form Notification** (Admin)
   - Triggered when someone submits the contact form
   - Sent to `ADMIN_EMAIL`

4. **Contact Form Confirmation** (Sender)
   - Acknowledgment email to the sender

5. **Custom Admin Notifications**
   - Sent from `/admin/notifications` page
   - Personalized messages to enrolled students

## Security Notes

- Never commit API tokens to version control
- Use strong, unique tokens with minimal required permissions
- Rotate tokens periodically
- Monitor Cloudflare analytics for suspicious activity

## Support

For issues with:
- **Cloudflare Email**: [Cloudflare Support](https://support.cloudflare.com)
- **Supabase Functions**: [Supabase Docs](https://supabase.com/docs)
- **Application**: Contact the development team
