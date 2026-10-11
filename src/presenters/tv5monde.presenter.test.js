// Unit checks for the FRA-55 TV5Monde presenter: allowlist validation and
// the curated external-resource list (links only, no copied content).
import {
  EXTERNAL_HOSTS_ALLOWLIST,
  TV5MONDE_EMBED_ALLOWED,
  TV5MONDE_SITE_URL,
  TV5_LISTENING_RESOURCES,
  isAllowedExternalUrl,
  tv5Resource,
} from './tv5monde.presenter.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

assert(TV5MONDE_EMBED_ALLOWED === false, 'embeds off by default: no permitted mechanism (verified 2026-10-11)');
assert(
  EXTERNAL_HOSTS_ALLOWLIST.includes('apprendre.tv5monde.com'),
  'allowlist covers apprendre.tv5monde.com'
);
assert(isAllowedExternalUrl(TV5MONDE_SITE_URL), 'site URL passes the allowlist');
assert(isAllowedExternalUrl('https://apprendre.tv5monde.com/en'), 'https deep link passes');
assert(!isAllowedExternalUrl('http://apprendre.tv5monde.com/'), 'plain http rejected');
assert(!isAllowedExternalUrl('https://evil.example.com/x'), 'non-allowlisted host rejected');
assert(!isAllowedExternalUrl('not a url'), 'garbage rejected');
assert(!isAllowedExternalUrl(''), 'empty rejected');

const good = tv5Resource({ title: ' T ', description: ' D ', url: TV5MONDE_SITE_URL, level: 'B2' });
assert(good && good.title === 'T' && good.url === TV5MONDE_SITE_URL && good.level === 'B2', 'valid resource passes through trimmed');
assert(tv5Resource({ title: '', url: TV5MONDE_SITE_URL }) === null, 'missing title -> null');
assert(tv5Resource({ title: 'T', url: 'https://evil.example.com/' }) === null, 'non-allowlisted url -> null');
assert(tv5Resource() === null, 'no args -> null');

assert(
  Array.isArray(TV5_LISTENING_RESOURCES) && TV5_LISTENING_RESOURCES.length > 0,
  'curated listening list is non-empty'
);
assert(
  TV5_LISTENING_RESOURCES.every((r) => isAllowedExternalUrl(r.url)),
  'every curated resource URL passes the allowlist'
);

console.log('tv5monde.presenter checks passed');
