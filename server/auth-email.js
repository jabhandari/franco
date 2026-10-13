import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { query, pool } from './database.js';
import { sendMail } from './email.js';

export const hashEmailToken = value => createHash('sha256').update(value).digest('hex');
export const validEmailToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const generic = { message: 'If that address has an eligible account, we will send an email shortly.' };
export const genericEmailResponse = generic;

// A mail link may return to the current Cloudflare Pages deployment. Only
// Franco's own Pages project is trusted; arbitrary Origin headers must not
// turn password-reset emails into off-site token links.
export function frontendOrigin(origin) {
  if (typeof origin !== 'string') return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) return null;
    if (url.hostname === 'franco-dsh.pages.dev' || url.hostname.endsWith('.franco-dsh.pages.dev')) return url.origin;
  } catch { /* Fall back to configured frontend URL. */ }
  return null;
}
function frontendLink(path, token, origin) {
  const url = new URL(path, frontendOrigin(origin) || process.env.FRONTEND_URL || 'https://franco-dsh.pages.dev');
  url.searchParams.set('token', token);
  return url.href;
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}
export async function sendAuthEmail(userId, email, type, origin) {
  const token = randomBytes(32).toString('hex');
  const minutes = type === 'verify' ? 24 * 60 : 60;
  await query("INSERT INTO email_tokens(id,user_id,token_hash,type,expires_at) VALUES(?,?,?,?,NOW()+(? * INTERVAL '1 minute'))",
    [randomUUID(), userId, hashEmailToken(token), type, minutes]);
  const link = frontendLink(type === 'verify' ? '/verify-email' : '/reset-password', token, origin);
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

// Render terminates TLS at a trusted proxy and appends the immediate client
// address to X-Forwarded-For. Ignore caller-supplied earlier entries.
export function authClientIp(req, renderServiceId = process.env.RENDER_SERVICE_ID) {
  if (renderServiceId && typeof req.headers['x-forwarded-for'] === 'string') {
    const forwarded = req.headers['x-forwarded-for'].split(',').at(-1)?.trim();
    if (forwarded && isIP(forwarded)) return forwarded;
  }
  return req.socket.remoteAddress || '';
}

// Per-address and per-IP limits share one row per request. The IP lock keeps
// concurrent requests on different addresses from evading the shared budget.
export async function allowAuthEmail(scope, email, ip, max = 5) {
  const key = hashEmailToken(`${scope}:${email}:${ip}`);
  const ipKey = hashEmailToken(`ip:${ip}`);
  const scopeLimit = scope === 'signup' ? 5 : 10;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [ipKey]);
    const { rows } = await client.query(`
      SELECT COUNT(*) FILTER (WHERE scope_hash=$1)::int AS address_count,
             COUNT(*) FILTER (WHERE ip_hash=$2 AND scope=$3)::int AS scope_ip_count,
             COUNT(*) FILTER (WHERE ip_hash=$2)::int AS ip_count
      FROM auth_email_requests
      WHERE created_at > NOW() - INTERVAL '1 hour' AND (scope_hash=$1 OR ip_hash=$2)`, [key, ipKey, scope]);
    const { address_count, scope_ip_count, ip_count } = rows[0];
    if (address_count >= max || scope_ip_count >= scopeLimit || ip_count >= 20) {
      await client.query('COMMIT');
      return false;
    }
    await client.query('INSERT INTO auth_email_requests(id,scope_hash,ip_hash,scope) VALUES($1,$2,$3,$4)', [randomUUID(),key,ipKey,scope]);
    // Bound storage without making every request scan the retention index.
    if (Math.random() < 0.02) await client.query("DELETE FROM auth_email_requests WHERE created_at < NOW() - INTERVAL '2 hours'");
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
