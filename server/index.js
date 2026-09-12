import { createHash, pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { db, migrate, createProfileForUser } from './database.js';

const PORT = Number(process.env.PORT || 8787);
const SESSION_DAYS = 14;

migrate();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': 'http://127.0.0.1:5173',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(randomUUID(), userId, tokenHash, expiresAt);

  return { token, expiresAt };
}

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  const row = db.prepare(`
    SELECT users.id, users.email, users.name, sessions.expires_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(hashToken(token));

  if (!row || new Date(row.expires_at) <= new Date()) return null;
  return { id: row.id, email: row.email, name: row.name };
}

function getUserPayload(user) {
  const profile = db.prepare(`
    SELECT current_level, learning_goal, placement_status
    FROM learner_profiles
    WHERE user_id = ?
  `).get(user.id);

  const progress = db.prepare(`
    SELECT cefr_level, skill, strength, updated_at
    FROM user_skill_estimates
    WHERE user_id = ?
    ORDER BY cefr_level, skill
  `).all(user.id);

  const mistakes = db.prepare(`
    SELECT id, concept_id, prompt, correction, status, created_at
    FROM mistakes
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(user.id);

  const attempts = db.prepare(`
    SELECT id, exercise_id, concept_id, skill, result, answer, created_at
    FROM attempts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(user.id);

  return {
    user,
    profile: profile || null,
    progress,
    mistakes,
    attempts
  };
}

function getContentSections() {
  const rows = db.prepare(`
    SELECT
      cefr_section AS section,
      COUNT(*) AS example_count,
      (SELECT COUNT(*) FROM exercise_items WHERE exercise_items.cefr_section = example_sentences.cefr_section) AS exercise_count,
      ROUND(AVG(token_count), 1) AS average_tokens,
      ROUND(AVG(difficulty_score), 1) AS average_difficulty
    FROM example_sentences
    GROUP BY cefr_section
    ORDER BY cefr_section
  `).all();

  const source = db.prepare(`
    SELECT name, url, license, attribution, imported_at
    FROM content_sources
    WHERE id = 'ud-fr-gsd'
  `).get();

  return {
    source: source || null,
    sections: rows,
    note: 'A1-B2 sections are local difficulty heuristics generated from UD annotations, not official CEFR labels.'
  };
}

function getSectionPayload(section) {
  const normalized = section.toUpperCase();
  const examples = db.prepare(`
    SELECT id, source_sentence_id, text, cefr_section, token_count, verb_count,
      noun_count, adjective_count, adposition_count, has_subordination, difficulty_score
    FROM example_sentences
    WHERE cefr_section = ?
    ORDER BY difficulty_score, token_count, text
  `).all(normalized);

  const exercises = db.prepare(`
    SELECT exercise_items.id, exercise_items.example_id, exercise_items.cefr_section,
      exercise_items.exercise_type, exercise_items.prompt, exercise_items.answer,
      exercise_items.choices_json, exercise_items.explanation, example_sentences.text AS source_text
    FROM exercise_items
    JOIN example_sentences ON example_sentences.id = exercise_items.example_id
    WHERE exercise_items.cefr_section = ?
    ORDER BY example_sentences.difficulty_score, exercise_items.exercise_type
  `).all(normalized).map((row) => ({
    ...row,
    choices: row.choices_json ? JSON.parse(row.choices_json) : null,
    choices_json: undefined
  }));

  return {
    section: normalized,
    examples,
    exercises
  };
}

function getTopicPayload(section = 'A1') {
  const normalized = section.toUpperCase();
  const topics = db.prepare(`SELECT id, cefr_section, category, title, item
    FROM learning_topics WHERE cefr_section = ? ORDER BY category, title, item`).all(normalized);
  return { section: normalized, categories: Array.from(new Set(topics.map((topic) => topic.category))), topics };
}

function getTv5Payload(section) {
  const params = [];
  let sql = `SELECT id, external_id, cefr_section, title, exercise_url, metadata_json
    FROM tv5_exercises`;
  if (section) { sql += ' WHERE cefr_section = ?'; params.push(section.toUpperCase()); }
  sql += ' ORDER BY cefr_section, title';
  const exercises = db.prepare(sql).all(...params).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json), metadata_json: undefined }));
  return { section: section?.toUpperCase() || 'all', exercises, count: exercises.length,
    source: db.prepare('SELECT name, url, license, attribution FROM content_sources WHERE id = ?').get('tv5monde-free-exercises') };
}

function getExamQuestionPayload(section = 'A1') {
  const normalized = section.toUpperCase();
  const questions = db.prepare(`
    SELECT id, external_id, exam_name, cefr_section, skill, prompt, context,
      choices_json, answer, explanation, source_url
    FROM exam_questions
    WHERE cefr_section = ?
    ORDER BY exam_name, skill, external_id
  `).all(normalized).map((row) => ({
    ...row,
    choices: row.choices_json ? JSON.parse(row.choices_json) : [],
    choices_json: undefined
  }));

  const sources = db.prepare(`
    SELECT DISTINCT content_sources.name, content_sources.url, content_sources.license, content_sources.attribution
    FROM exam_questions
    JOIN content_sources ON content_sources.id = exam_questions.source_id
    WHERE exam_questions.cefr_section = ?
    ORDER BY content_sources.name
  `).all(normalized);

  return {
    section: normalized,
    questions,
    sources,
    note: 'These are imported sample questions. CEFR section labels are app heuristics unless the source explicitly provides a level.'
  };
}

async function handleSignup(req, res) {
  const body = await readBody(req);
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || email?.split('@')[0];
  const password = body.password || '';

  if (!email || !password || password.length < 8) {
    return json(res, 400, { error: 'Email and an 8 character password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return json(res, 409, { error: 'An account already exists for this email.' });

  const id = randomUUID();
  const { salt, hash } = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, password_salt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, email, name, hash, salt);

  createProfileForUser(id);

  const session = createSession(id);
  return json(res, 201, { token: session.token, expiresAt: session.expiresAt, ...getUserPayload({ id, email, name }) });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const email = body.email?.trim().toLowerCase();
  const password = body.password || '';
  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!userRow) return json(res, 401, { error: 'Invalid email or password.' });

  const { hash } = hashPassword(password, userRow.password_salt);
  if (hash !== userRow.password_hash) return json(res, 401, { error: 'Invalid email or password.' });

  createProfileForUser(userRow.id);
  const session = createSession(userRow.id);

  return json(res, 200, {
    token: session.token,
    expiresAt: session.expiresAt,
    ...getUserPayload({ id: userRow.id, email: userRow.email, name: userRow.name })
  });
}

function requireUser(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    json(res, 401, { error: 'Authentication required.' });
    return null;
  }
  return user;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': 'http://127.0.0.1:5173',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-methods': 'GET, POST, OPTIONS'
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, database: 'connected' });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/signup') return handleSignup(req, res);
    if (req.method === 'POST' && url.pathname === '/api/auth/login') return handleLogin(req, res);

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const user = requireUser(req, res);
      if (!user) return;
      return json(res, 200, getUserPayload(user));
    }

    if (req.method === 'GET' && url.pathname === '/api/me/session-plan') {
      const user = requireUser(req, res);
      if (!user) return;
      const section = url.searchParams.get('section') || 'A1';
      const payload = getSectionPayload(section);
      const exercises = payload.exercises;
      return json(res, 200, {
        reviewsDue: 0,
        newConcepts: payload.examples.length,
        estimatedMinutes: exercises.length ? 12 : null,
        section: payload.section,
        exercises,
        message: exercises.length
          ? 'Session plan generated from imported UD French GSD examples.'
          : 'Import content before starting a session.'
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/me/progress') {
      const user = requireUser(req, res);
      if (!user) return;
      return json(res, 200, { progress: getUserPayload(user).progress });
    }

    if (req.method === 'GET' && url.pathname === '/api/me/conversation-targets') {
      const user = requireUser(req, res);
      if (!user) return;
      const examples = getSectionPayload('A1').examples.slice(0, 5);
      return json(res, 200, {
        scenario: 'guided sentence practice',
        targets: examples.map((example) => ({
          id: example.id,
          text: example.text,
          section: example.cefr_section
        })),
        message: 'Conversation targets are currently seeded from imported A1 examples.'
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/content/sections') {
      return json(res, 200, getContentSections());
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/content/sections/')) {
      const section = decodeURIComponent(url.pathname.split('/').pop() || 'A1');
      return json(res, 200, getSectionPayload(section));
    }

    if (req.method === 'GET' && url.pathname === '/api/content/topics') {
      return json(res, 200, getTopicPayload(url.searchParams.get('section') || 'A1'));
    }

    if (req.method === 'GET' && url.pathname === '/api/content/tv5-exercises') {
      return json(res, 200, getTv5Payload(url.searchParams.get('section') || undefined));
    }

    if (req.method === 'GET' && url.pathname === '/api/exam/questions') {
      return json(res, 200, getExamQuestionPayload(url.searchParams.get('section') || 'A1'));
    }

    if (req.method === 'GET' && url.pathname === '/api/exam/past-questions') {
      const questions = db.prepare(`SELECT id, external_id, exam_name, cefr_section, skill, prompt, context,
        choices_json, answer, explanation, source_url FROM exam_questions
        ORDER BY cefr_section, exam_name, skill, external_id`).all().map((row) => ({
          ...row, choices: row.choices_json ? JSON.parse(row.choices_json) : [], choices_json: undefined
        }));
      const sources = db.prepare(`SELECT DISTINCT name, url, license, attribution FROM content_sources
        WHERE id IN (SELECT source_id FROM exam_questions) ORDER BY name`).all();
      return json(res, 200, { questions, sources, note: 'Imported past and sample exam questions with source attribution.' });
    }

    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unexpected server error.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Franco API listening on http://127.0.0.1:${PORT}`);
});
