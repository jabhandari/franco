// Runtime configuration for the API server.
//
// Everything is read from the environment so the same code runs locally,
// on Render (free tier), and in PR-preview instances without changes:
//   PORT         - port to listen on (Render injects this; default 8787)
//   HOST         - interface to bind (Render requires 0.0.0.0; default 0.0.0.0)
//   CORS_ORIGINS - comma-separated list of allowed browser origins
//                  (default http://127.0.0.1:5173 for local dev)
//   ENFORCE_EMAIL_VERIFICATION - when 'true', login is refused until the
//                  email address is verified (default false). The
//                  verification email flow needs a production sending
//                  domain (Resend); until that exists, accounts are usable
//                  immediately after signup. Set to 'true' once the domain
//                  is live.
//

// Any https://*.pages.dev origin is additionally allowed so per-PR
// Cloudflare Pages previews work without listing every subdomain.

export const getPort = () => Number(process.env.PORT || 8787);

// Whether login requires a verified email address. Defaults to false while
// the verification email flow has no production sending domain; set
// ENFORCE_EMAIL_VERIFICATION=true once the domain is live.
export const getEnforceEmailVerification = () =>
  process.env.ENFORCE_EMAIL_VERIFICATION === 'true';

export const getHost = () => process.env.HOST || '0.0.0.0';

export const getCorsOrigins = () => {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : ['http://127.0.0.1:5173'];
};

// Returns the Access-Control-Allow-Origin value for a request Origin.
export function corsOrigin(origin, origins = getCorsOrigins()) {
  if (origin && origins.includes(origin)) return origin;
  if (origin) {
    try {
      if (new URL(origin).hostname.endsWith('.pages.dev')) return origin;
    } catch {
      // Not a parseable URL: fall through to the default below.
    }
  }
  return origins[0] || '*';
}
