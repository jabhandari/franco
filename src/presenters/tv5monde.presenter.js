// FRA-55 presenter: TV5Monde Apprendre external embeds with removal fallback.
//
// Terms verification (2026-10-11, noted on FRA-55):
// - apprendre.tv5monde.com serves `X-Frame-Options: SAMEORIGIN`, so browsers
//   block raw iframes of their pages today.
// - TV5MONDE's published terms prohibit any use of their programmes that is
//   not expressly authorised, and forbid reproduction / re-publication /
//   distribution without express authorisation.
// - No official public embed player or embed code is offered for third-party
//   sites.
// Conclusion: there is currently NO officially-permitted embed mechanism, so
// TV5MONDE_EMBED_ALLOWED stays false and the UI ships the graceful state
// (placeholder card + outbound link). If TV5Monde ever grants permission, set
// the flag to true and pass an embedUrl -- the component still falls back to
// the placeholder if the frame errors or is removed later.
//
// Project rule: never scrape, download, copy, or redistribute their content.
// Links out are fine; nothing of theirs lives in this repo or our DB.

export const TV5MONDE_SITE_URL = 'https://apprendre.tv5monde.com/';

// Master switch for the iframe path. False until TV5Monde expressly permits
// embedding (see note above).
export const TV5MONDE_EMBED_ALLOWED = false;

// Hosts we are willing to frame or link out to for external exercises.
export const EXTERNAL_HOSTS_ALLOWLIST = ['apprendre.tv5monde.com', 'www.tv5monde.com'];

export function isAllowedExternalUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'https:' && EXTERNAL_HOSTS_ALLOWLIST.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Validate a curated external resource. Titles/descriptions are our own
// words -- never TV5Monde copy. Returns the resource or null when invalid,
// so the UI skips it gracefully instead of rendering a broken card.
export function tv5Resource({ title, description, url, level } = {}) {
  const cleanTitle = String(title || '').trim();
  const cleanUrl = String(url || '').trim();
  if (!cleanTitle || !isAllowedExternalUrl(cleanUrl)) return null;
  return {
    title: cleanTitle,
    description: String(description || '').trim(),
    url: cleanUrl,
    level: typeof level === 'string' && level ? level : null,
  };
}

// Curated external listening resources. Links only -- zero TV5Monde content
// copied into the repo. Extend this list (the replacement-content backlog)
// rather than hardcoding URLs in views.
const RAW_TV5_LISTENING_RESOURCES = [
  {
    title: 'Apprendre TV5Monde — listening exercises',
    description:
      'Free video-based listening comprehension exercises from TV5Monde, A1 to B2, with subtitles and transcripts. Opens on their site.',
    url: TV5MONDE_SITE_URL,
    level: null,
  },
];

export const TV5_LISTENING_RESOURCES = RAW_TV5_LISTENING_RESOURCES.map(tv5Resource).filter(Boolean);
