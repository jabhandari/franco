import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { query, pool } from './database.js';
import { sendMail } from './email.js';

export const hashEmailToken = value => createHash('sha256').update(value).digest('hex');
export const validEmailToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const generic = { message: 'If that address has an eligible account, we will send an email shortly.' };
export const genericEmailResponse = generic;

function frontendLink(path, token) {
  const url = new URL(path, process.env.FRONTEND_URL || 'https://franco-dsh.pages.dev');
  url.searchParams.set('token', token);
  return url.href;
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}
export async function sendAuthEmail(userId, email, type) {
  const token = randomBytes(32).toString('hex');
  const minutes = type === 'verify' ? 24 * 60 : 60;
  await query("INSERT INTO email_tokens(id,user_id,token_hash,type,expires_at) VALUES(?,?,?,?,NOW()+(? * INTERVAL '1 minute'))",
    [randomUUID(), userId, hashEmailToken(token), type, minutes]);
  const link = frontendLink(type === 'verify' ? '/verify-email' : '/reset-password', token);
  const subject = type === 'verify' ? 'Verify your Franco email' : 'Reset your Franco password';
  const action = type === 'verify' ? 'Verify your email' : 'Reset your password';
  const text = `${action}: ${link}\n\nThis link expires in ${type === 'verify' ? '24 hours' : '1 hour'}. If you did not request this, you can ignore this email.`;
  try {
    await sendMail({ to: email, subject, text, html: `<p>${escapeHtml(action)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(action)}</a></p><p>This link expires in ${type === 'verify' ? '24 hours' : '1 hour'}.</p><p>If you did not request this, you can ignore this email.</p>` });
  } catch (error) {
    await query('DELETE FROM email_tokens WHERE token_hash=?', [hashEmailToken(token)]);
    throw error;
  }
}

// Database-backed limiter works across Render instances. Count and insert are
// serialized by a transaction-level advisory lock for this email/IP/scope.
export async function allowAuthEmail(scope, email, ip, max = 5) {
  const key = hashEmailToken(`${scope}:${email}:${ip}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM auth_email_requests WHERE scope_hash=$1 AND created_at>NOW()-INTERVAL '1 hour'", [key]);
    if (rows[0].count >= max) { await client.query('COMMIT'); return false; }
    await client.query('INSERT INTO auth_email_requests(id,scope_hash) VALUES($1,$2)', [randomUUID(), key]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
