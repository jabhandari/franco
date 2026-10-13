import { Resend } from 'resend';

export function emailConfigured() {
  return (process.env.EMAIL_PROVIDER || 'resend') === 'resend' && Boolean(process.env.RESEND_API_KEY);
}

export async function sendMail({ to, subject, html, text }) {
  if ((process.env.EMAIL_PROVIDER || 'resend') !== 'resend') throw new Error('Unsupported email provider.');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required to send email.');
  // RESEND_BASE_URL is a test-only escape hatch: the integration script points
  // it at a fake local mail server so no real mail leaves the machine. Unset
  // in production, where the Resend SDK default (https://api.resend.com) applies.
  const resend = new Resend(process.env.RESEND_API_KEY, {
    baseUrl: process.env.RESEND_BASE_URL || undefined,
  });
  const { error } = await resend.emails.send({
    // A bare address with no display name reads as spam. Operators can still
    // override the whole value (including the name) via EMAIL_FROM.
    from: process.env.EMAIL_FROM || 'Franco <onboarding@resend.dev>', to, subject, html, text,
  });
  if (error) throw new Error(`Resend delivery failed: ${error.message}`);
}
