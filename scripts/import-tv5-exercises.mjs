import { createHash } from 'node:crypto';
import { db, migrate } from '../server/database.js';

const SOURCE = {
  id: 'tv5monde-free-exercises',
  name: 'TV5MONDE Apprendre free exercises',
  url: 'https://apprendre.tv5monde.com/en/collection-all',
  license: 'Free online exercises; TV5MONDE copyright and terms apply',
  attribution: 'TV5MONDE - Apprendre le français'
};
const levels = [
  ['A1', 'a1-breakthrough'], ['A2', 'a2-waystage'],
  ['B1', 'b1-threshold'], ['B2', 'b2-vantage']
];
migrate();

const html = await fetchText(SOURCE.url);
const rows = [];
for (const [level, slug] of levels) {
  // Walk every available page until TV5MONDE returns 404. Rerunning this
  // importer updates rows without mixing them with exam papers.
  for (let page = 0; ; page += 1) {
    const pageUrl = `https://apprendre.tv5monde.com/en/exercices/${slug}${page ? `?page=${page}` : ''}`;
    const pageHtml = await fetchText(pageUrl, true);
    if (!pageHtml) break;
    rows.push(...parseCards(pageHtml, level));
  }
}
const unique = Array.from(new Map(rows.map((row) => [row.externalId, row])).values());
const insertSource = db.prepare(`INSERT INTO content_sources (id,name,url,license,attribution,imported_at)
  VALUES (?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,
  license=excluded.license,attribution=excluded.attribution,imported_at=CURRENT_TIMESTAMP`);
const insert = db.prepare(`INSERT INTO tv5_exercises (id,source_id,external_id,cefr_section,title,exercise_url,metadata_json)
  VALUES (?,?,?,?,?,?,?) ON CONFLICT(source_id,external_id) DO UPDATE SET cefr_section=excluded.cefr_section,
  title=excluded.title,exercise_url=excluded.exercise_url,metadata_json=excluded.metadata_json,imported_at=CURRENT_TIMESTAMP`);
db.exec('BEGIN');
try {
  insertSource.run(SOURCE.id, SOURCE.name, SOURCE.url, SOURCE.license, SOURCE.attribution);
  for (const row of unique) insert.run(stableId(`${SOURCE.id}:${row.externalId}`), SOURCE.id, row.externalId, row.level, row.title, row.url, JSON.stringify({ tags: row.tags, note: 'Imported catalogue link; activity is completed on TV5MONDE.' }));
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; }
console.log(`Imported ${unique.length} TV5MONDE exercise links`);
console.table(db.prepare('SELECT cefr_section AS section, COUNT(*) AS exercises FROM tv5_exercises GROUP BY cefr_section ORDER BY cefr_section').all());

async function fetchText(url, allowMissing = false) {
  const response = await fetch(url, { headers: { 'user-agent': 'franco-learning-importer' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) { if (allowMissing && response.status === 404) return ''; throw new Error(`Failed to download ${url}: ${response.status}`); }
  return response.text();
}
function parseCards(html, level) {
  const out = [];
  const re = /<a[^>]+href="([^"]*\/(?:exercices|exercises)\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const url = new URL(match[1], SOURCE.url).href;
    const title = clean(match[2]);
    if (!title || title.length < 3) continue;
    out.push({ externalId: url.replace(/\?.*$/, ''), level, title, url, tags: [] });
  }
  return out;
}
function clean(value) { return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function stableId(value) { return createHash('sha1').update(value).digest('hex'); }
