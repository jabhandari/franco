import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const CONTENT_SCHEMA_VERSION = 'content.v1';
export const CONTENT_TYPES = ['multiple_choice', 'cloze', 'free_text', 'word_order', 'reading', 'listening', 'speaking', 'vocabulary', 'listen_repeat'];
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const METHODS = ['source', 'human_review', 'heuristic', 'model', 'mixed'];
const EVALUATORS = ['exact', 'choice', 'normalized_text', 'token_order', 'rubric', 'external'];

export async function schemaDocument() {
  return JSON.parse(await readFile(join(process.cwd(), 'schemas', 'content.v1.schema.json'), 'utf8'));
}

function issue(path, message) { return { path, message }; }
function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function checkObject(value, path, allowed, errors) {
  if (!isObject(value)) { errors.push(issue(path, 'must be an object')); return false; }
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(issue(`${path}.${key}`, 'unknown field'));
  return true;
}
function required(value, fields, path, errors) { for (const field of fields) if (value[field] === undefined) errors.push(issue(`${path}.${field}`, 'is required')); }
function string(value, path, errors, min = 1, max = 20000) { if (typeof value !== 'string' || value.length < min || value.length > max) errors.push(issue(path, `must be a string between ${min} and ${max} characters`)); }

function validateSource(source, errors) {
  const p = '$.source';
  if (!checkObject(source, p, new Set(['id', 'name', 'url', 'license', 'attribution']), errors)) return;
  required(source, ['id', 'name', 'url', 'license', 'attribution'], p, errors);
  string(source.id, `${p}.id`, errors, 1, 128); string(source.name, `${p}.name`, errors, 1, 300); string(source.url, `${p}.url`, errors, 1, 2000); string(source.license, `${p}.license`, errors, 1, 500); string(source.attribution, `${p}.attribution`, errors, 1, 1000);
  if (typeof source.id === 'string' && !/^[a-z0-9._:-]+$/.test(source.id)) errors.push(issue(`${p}.id`, 'must use lowercase slug characters'));
  try { new URL(source.url); } catch { errors.push(issue(`${p}.url`, 'must be a valid URL')); }
}

function validateItem(item, index, errors) {
  const p = `$.items[${index}]`;
  const allowed = new Set(['external_id', 'type', 'title', 'prompt', 'instructions', 'context', 'cefr', 'difficulty', 'response', 'evaluation', 'concepts', 'tags', 'media', 'metadata']);
  if (!checkObject(item, p, allowed, errors)) return;
  required(item, ['external_id', 'type', 'cefr', 'prompt', 'response', 'evaluation'], p, errors);
  string(item.external_id, `${p}.external_id`, errors, 1, 500); string(item.prompt, `${p}.prompt`, errors, 1, 20000);
  if (item.title !== undefined) string(item.title, `${p}.title`, errors, 0, 500);
  if (item.instructions !== undefined) string(item.instructions, `${p}.instructions`, errors, 0, 10000);
  if (item.context !== undefined) string(item.context, `${p}.context`, errors, 0, 100000);
  if (!CONTENT_TYPES.includes(item.type)) errors.push(issue(`${p}.type`, `must be one of ${CONTENT_TYPES.join(', ')}`));
  const c = item.cefr;
  if (checkObject(c, `${p}.cefr`, new Set(['level', 'method', 'confidence', 'evidence']), errors)) {
    required(c, ['level', 'method'], `${p}.cefr`, errors);
    if (!CEFR_LEVELS.includes(c.level)) errors.push(issue(`${p}.cefr.level`, 'must be A1, A2, B1, B2, C1, or C2'));
    if (!METHODS.includes(c.method)) errors.push(issue(`${p}.cefr.method`, `must be one of ${METHODS.join(', ')}`));
    if (c.confidence !== undefined && (typeof c.confidence !== 'number' || c.confidence < 0 || c.confidence > 1)) errors.push(issue(`${p}.cefr.confidence`, 'must be between 0 and 1'));
  }
  if (item.difficulty !== undefined && checkObject(item.difficulty, `${p}.difficulty`, new Set(['band', 'score', 'method']), errors)) {
    if (item.difficulty.score !== undefined && (typeof item.difficulty.score !== 'number' || item.difficulty.score < 0 || item.difficulty.score > 100)) errors.push(issue(`${p}.difficulty.score`, 'must be between 0 and 100'));
  }
  if (!checkObject(item.response, `${p}.response`, new Set(['choices', 'answer', 'accepted_answers', 'tokens']), errors)) return;
  if (!checkObject(item.evaluation, `${p}.evaluation`, new Set(['mode', 'rubric', 'case_sensitive']), errors)) return;
  required(item.evaluation, ['mode'], `${p}.evaluation`, errors);
  if (!EVALUATORS.includes(item.evaluation.mode)) errors.push(issue(`${p}.evaluation.mode`, 'unsupported evaluator'));
  if (item.type === 'multiple_choice' && (!Array.isArray(item.response.choices) || item.response.choices.length < 2)) errors.push(issue(`${p}.response.choices`, 'multiple_choice requires at least two choices'));
  if (item.type === 'multiple_choice') {
    if (typeof item.response.answer !== 'string') errors.push(issue(`${p}.response.answer`, 'multiple_choice requires the correct choice id'));
    if (item.evaluation.mode !== 'choice') errors.push(issue(`${p}.evaluation.mode`, 'multiple_choice requires the choice evaluator'));
    if (Array.isArray(item.response.choices) && typeof item.response.answer === 'string' && !item.response.choices.some(choice => choice.id === item.response.answer)) errors.push(issue(`${p}.response.answer`, 'must match a choice id'));
  }
  if (item.type === 'word_order') {
    if (!Array.isArray(item.response.tokens) || item.response.tokens.length < 2) errors.push(issue(`${p}.response.tokens`, 'word_order requires ordered tokens'));
    if (item.evaluation.mode !== 'token_order') errors.push(issue(`${p}.evaluation.mode`, 'word_order requires the token_order evaluator'));
  }
  if (item.type === 'listen_repeat') {
    if (typeof item.response.answer !== 'string' || !item.response.answer.trim()) errors.push(issue(`${p}.response.answer`, 'listen_repeat requires the expected phrase'));
    if (item.evaluation.mode !== 'normalized_text') errors.push(issue(`${p}.evaluation.mode`, 'listen_repeat requires normalized_text for typed answers'));
  }
  if (['listening', 'speaking', 'listen_repeat'].includes(item.type) && (!Array.isArray(item.media) || !item.media.some(media => media.kind === 'audio'))) errors.push(issue(`${p}.media`, `${item.type} requires an audio media reference`));
  for (const field of ['concepts', 'tags']) if (item[field] !== undefined && (!Array.isArray(item[field]) || item[field].some(x => typeof x !== 'string' || !x.trim()))) errors.push(issue(`${p}.${field}`, 'must be an array of non-empty strings'));
  if (item.media !== undefined && (!Array.isArray(item.media) || item.media.some(m => !isObject(m) || typeof m.url !== 'string' || !['audio', 'image', 'video', 'document'].includes(m.kind)))) errors.push(issue(`${p}.media`, 'contains invalid media reference'));
}

export function validateBatch(batch) {
  const errors = [];
  const allowed = new Set(['schema_version', 'batch_id', 'idempotency_key', 'source', 'items', 'auto_publish']);
  if (!checkObject(batch, '$', allowed, errors)) return { valid: false, errors };
  required(batch, ['schema_version', 'batch_id', 'idempotency_key', 'source', 'items'], '$', errors);
  if (batch.auto_publish !== undefined && typeof batch.auto_publish !== 'boolean') errors.push(issue('$.auto_publish', 'must be a boolean when present'));
  if (batch.schema_version !== CONTENT_SCHEMA_VERSION) errors.push(issue('$.schema_version', `must be ${CONTENT_SCHEMA_VERSION}`));
  string(batch.batch_id, '$.batch_id', errors, 1, 128); string(batch.idempotency_key, '$.idempotency_key', errors, 8, 256);
  validateSource(batch.source, errors);
  if (!Array.isArray(batch.items) || batch.items.length < 1 || batch.items.length > 5000) errors.push(issue('$.items', 'must contain between 1 and 5000 items'));
  else batch.items.forEach((item, index) => validateItem(item, index, errors));
  return { valid: errors.length === 0, errors };
}

export function normalizeItem(item) {
  const clean = (value) => typeof value === 'string' ? value.normalize('NFKC').trim() : value;
  return { ...item, external_id: clean(item.external_id), title: item.title === undefined ? undefined : clean(item.title), prompt: clean(item.prompt), instructions: item.instructions === undefined ? undefined : clean(item.instructions), context: item.context === undefined ? undefined : clean(item.context), cefr: { ...item.cefr, level: item.cefr.level.toUpperCase() }, tags: item.tags?.map(clean).filter(Boolean) ?? [], concepts: item.concepts?.map(clean).filter(Boolean) ?? [] };
}
