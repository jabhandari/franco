import { Resend } from 'resend';

export async function sendMail({ to, subject, html, text }) {
  if ((process.env.EMAIL_PROVIDER || 'resend') !== 'resend') throw new Error('Unsupported email provider.');
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required to send email.');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev', to, subject, html, text,
  });
  if (error) throw new Error(`Resend delivery failed: ${error.message}`);
}
