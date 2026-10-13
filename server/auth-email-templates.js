function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}

// Brand palette mirrors src/styles.css so transactional mail reads as
// Franco, not a phish. All styling is inline + table-based: email clients
// ignore <style> blocks and external CSS.
const BRAND = {
  cream: '#f7f3ea',
  paper: '#fffdf8',
  sand: '#e3d8ca',
  navy: '#122438',
  navySoft: '#243b53',
  teal: '#087f83',
  ink: '#1f2830',
  slate: '#687178',
};

export function authEmailShell({ title, preheader, headline, introHtml, introText, ctaLabel, link, email, expiryNote, reassuranceHtml, reassuranceText, sentReason }) {
  const safeLink = escapeHtml(link);
  const safeEmail = escapeHtml(email);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:${BRAND.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.cream};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background-color:${BRAND.paper};border:1px solid ${BRAND.sand};border-radius:12px;">
<tr><td style="padding:32px 36px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:38px;height:38px;background-color:${BRAND.navySoft};border-radius:8px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;color:#ffffff;">fr</td>
<td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:${BRAND.navy};">Franco</td>
</tr></table>
</td></tr>
<tr><td style="padding:24px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;line-height:32px;color:${BRAND.navy};">${escapeHtml(headline)}</td></tr>
<tr><td style="padding:12px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${BRAND.ink};">${introHtml}</td></tr>
<tr><td align="center" style="padding:28px 36px 8px;">
<a href="${safeLink}" style="display:inline-block;background-color:${BRAND.teal};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:20px;text-decoration:none;padding:14px 32px;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
</td></tr>
<tr><td style="padding:16px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${BRAND.slate};">If the button doesn't work, copy and paste this link into your browser:<br><a href="${safeLink}" style="color:${BRAND.teal};word-break:break-all;">${safeLink}</a></td></tr>
<tr><td style="padding:16px 36px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${BRAND.slate};">${expiryNote}<br>${reassuranceHtml}</td></tr>
<tr><td style="padding:24px 36px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${BRAND.slate};border-top:1px solid ${BRAND.sand};">This email was sent to ${safeEmail} because ${sentReason}.<br>Franco &middot; French exam prep (TCF &middot; TEF &middot; DELF)</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
  const text = `${headline}\n\n${introText}\n\n${ctaLabel}:\n${link}\n\n${expiryNote} ${reassuranceText}\n\nThis email was sent to ${email} because ${sentReason}.\nFranco - French exam prep (TCF, TEF, DELF)`;
  return { subject: title, text, html };
}

// The welcome mail a new signup receives. Warm by design: it is the first
// thing Franco ever says to the learner.
export function buildVerifyEmail(link, email) {
  return authEmailShell({
    title: 'Welcome to Franco — confirm your email',
    preheader: "You're one step away — confirm your email to start learning French.",
    headline: 'Bienvenue to Franco! 🎉',
    introHtml: 'Thanks for creating your account — you&rsquo;re one quick step away from getting started. Confirm your email address to unlock lessons, practice exercises, and progress tracking for your TCF, TEF, or DELF goals.',
    introText: "Thanks for creating your account — you're one quick step away from getting started. Confirm your email address to unlock lessons, practice exercises, and progress tracking for your TCF, TEF, or DELF goals.",
    ctaLabel: 'Confirm my email',
    link,
    email,
    expiryNote: 'This link expires in 24 hours.',
    reassuranceHtml: 'Didn&rsquo;t sign up for Franco? You can safely ignore this email.',
    reassuranceText: "Didn't sign up for Franco? You can safely ignore this email.",
    sentReason: 'you created a Franco account',
  });
}

// Password resets should feel calm and safe, never alarming.
export function buildResetEmail(link, email) {
  return authEmailShell({
    title: 'Reset your Franco password',
    preheader: 'Choose a new password — it only takes a minute.',
    headline: "Let's reset your password",
    introHtml: 'We received a request to reset the password for your Franco account. Click the button below to choose a new one — it only takes a minute.',
    introText: 'We received a request to reset the password for your Franco account. Use the link below to choose a new one — it only takes a minute.',
    ctaLabel: 'Choose a new password',
    link,
    email,
    expiryNote: 'This link expires in 1 hour.',
    reassuranceHtml: 'If you didn&rsquo;t request this, you can safely ignore this email — your password will stay exactly as it is.',
    reassuranceText: "If you didn't request this, you can safely ignore this email — your password will stay exactly as it is.",
    sentReason: 'a password reset was requested for this address',
  });
}

