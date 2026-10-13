import assert from 'node:assert/strict';
import { buildResetEmail, buildVerifyEmail } from '../server/auth-email-templates.js';

// Hostile values must never break the markup or leak into attributes raw.
const nastyLink = 'https://franco-dsh.pages.dev/verify-email?token=abc123&next=<script>"\'';
const nastyEmail = 'a"b<c>&\'@example.com';

for (const [name, build] of [['verify', buildVerifyEmail], ['reset', buildResetEmail]]) {
  const { subject, text, html } = build(nastyLink, nastyEmail);

  assert(!html.includes('<script>"\''), `${name}: raw hostile payload leaked into html`);
  assert(html.includes('&lt;script&gt;&quot;&#39;'), `${name}: link not escaped in html`);
  assert(html.includes('a&quot;b&lt;c&gt;&amp;&#39;@example.com'), `${name}: recipient not escaped in html`);

  // The integration test (scripts/test-auth-email.mjs) pulls the token out of
  // the plain-text body with /https?:\/\/\S+/ — the link must sit alone on a
  // line, terminated by whitespace.
  const match = text.match(/https?:\/\/\S+/);
  assert(match, `${name}: no bare link in text body`);
  const parsed = new URL(match[0]);
  assert.equal(parsed.searchParams.get('token'), 'abc123', `${name}: token not extractable from text link`);
  // Plain text carries the raw link by design (clients linkify it); only the
  // HTML render must escape.

  // Both render paths must stay intact.
  assert(html.includes('<!DOCTYPE html>') && html.includes('</html>'), `${name}: html not a full document`);
  assert(text.length > 100, `${name}: text body suspiciously short`);
}

const verify = buildVerifyEmail('https://franco-dsh.pages.dev/verify-email?token=t', 'you@example.com');
assert.equal(verify.subject, 'Welcome to Franco — confirm your email');
assert(verify.html.includes('Bienvenue to Franco!'), 'verify headline missing');
assert(verify.html.includes('Confirm my email'), 'verify CTA missing');
assert(verify.html.includes('24 hours'), 'verify expiry missing');
assert(verify.text.includes('TCF, TEF, or DELF'), 'verify text missing exam tracks');

const reset = buildResetEmail('https://franco-dsh.pages.dev/reset-password?token=t', 'you@example.com');
assert.equal(reset.subject, 'Reset your Franco password');
assert(reset.html.includes('Choose a new password'), 'reset CTA missing');
assert(reset.html.includes('1 hour'), 'reset expiry missing');
assert(reset.html.includes('your password will stay exactly as it is'), 'reset reassurance missing');

console.log('Auth email templates OK: escaping, text-link contract, subjects, CTAs, expiry windows.');
