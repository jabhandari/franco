import assert from 'node:assert/strict';

const { getPort, getHost, getCorsOrigins, corsOrigin } = await import('../server/config.js');

// Defaults (no env overrides).
delete process.env.PORT; delete process.env.HOST; delete process.env.CORS_ORIGINS;
assert.equal(getPort(), 8787);
assert.equal(getHost(), '0.0.0.0');
assert.deepEqual(getCorsOrigins(), ['http://127.0.0.1:5173']);

// Exact origin matches.
assert.equal(corsOrigin('http://127.0.0.1:5173'), 'http://127.0.0.1:5173');
assert.equal(corsOrigin('https://franco-dsh.pages.dev', ['https://franco-dsh.pages.dev']), 'https://franco-dsh.pages.dev');

// Any *.pages.dev subdomain is allowed (per-PR Cloudflare Pages previews).
assert.equal(corsOrigin('https://fra-37.franco-dsh.pages.dev'), 'https://fra-37.franco-dsh.pages.dev');
assert.equal(corsOrigin('https://branch-name.franco-dsh.pages.dev'), 'https://branch-name.franco-dsh.pages.dev');

// Lookalike domains are NOT allowed.
assert.equal(corsOrigin('https://evilpages.dev'), 'http://127.0.0.1:5173');
assert.equal(corsOrigin('https://pages.dev.evil.com'), 'http://127.0.0.1:5173');

// Unknown origins and missing Origin fall back to the first configured origin.
assert.equal(corsOrigin('https://example.com'), 'http://127.0.0.1:5173');
assert.equal(corsOrigin(undefined), 'http://127.0.0.1:5173');
assert.equal(corsOrigin('not a url'), 'http://127.0.0.1:5173');

// CORS_ORIGINS env parsing: comma-separated, trimmed, empties dropped.
process.env.CORS_ORIGINS = ' https://a.example.com,,https://b.example.com ';
assert.deepEqual(getCorsOrigins(), ['https://a.example.com', 'https://b.example.com']);
assert.equal(corsOrigin('https://b.example.com'), 'https://b.example.com');
assert.equal(corsOrigin('http://127.0.0.1:5173'), 'https://a.example.com'); // falls back to first listed
delete process.env.CORS_ORIGINS;

// PORT/HOST env overrides.
process.env.PORT = '10000'; process.env.HOST = '127.0.0.1';
assert.equal(getPort(), 10000);
assert.equal(getHost(), '127.0.0.1');
delete process.env.PORT; delete process.env.HOST;

console.log('server config tests passed');
