// Text normalizers and item evaluation shared by the attempts endpoint and
// unit tests. All learner-facing comparisons are accent/case/whitespace
// tolerant; only the explicit `exact` evaluator stays strict-ish (trim only).

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    // French text commonly uses curly apostrophes; fold them for grading.
    .replace(/[‘’‛ʼ]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Trailing sentence punctuation never decides a grading comparison.
    .replace(/[.!?…]+$/, '')
    .trim();
}

export function normalizeTokens(tokens) {
  const list = Array.isArray(tokens) ? tokens : String(tokens ?? '').split(/\s+/);
  return list.map(normalizeText).filter(Boolean);
}

// Word-order items store the word bank (shuffled) in response_json.tokens
// alongside the correct sentence in answer/expected. Grading and reveals must
// resolve through this chain — the same one the attempts endpoint uses for
// reveals — so Practice and puzzles always agree on the sentence.
export function wordOrderReference(item) {
  const resp = item.response_json || {};
  const ev = item.evaluation_json || {};
  return String(resp.answer ?? resp.expected ?? ev.answer ?? ev.expected ??
    (Array.isArray(resp.tokens) ? resp.tokens.join(' ') : '')).trim();
}

// `item` carries response_json / evaluation_json (content_items) and `response`
// is the learner's raw answer (string, string[] for token_order, or object).
// Reference answers may live in response_json (contract batches) or
// evaluation_json (dataset-authored items, e.g. the founding dictation set).
export function evaluate(item, response) {
  const ev = item.evaluation_json || {};
  const resp = item.response_json || {};
  const refAnswer = resp.answer ?? ev.answer;
  const refExpected = resp.expected ?? ev.expected;
  // Dataset-authored `scoring` labels map onto the contract evaluators.
  const mode = ev.mode ?? (ev.scoring === 'exact_match_case_insensitive' ? 'normalized_text' : undefined);
  switch (mode) {
    case 'choice':
      // Case-insensitive, whitespace-tolerant (matches historic client behavior).
      return normalizeText(response) === normalizeText(refAnswer);
    case 'token_order': {
      const given = normalizeTokens(response);
      // Grade against the stored sentence, not the shuffled word bank.
      const expected = normalizeTokens(wordOrderReference(item));
      return given.length > 0 && given.length === expected.length && given.every((token, i) => token === expected[i]);
    }
    case 'normalized_text':
      return normalizeText(response) === normalizeText(refAnswer ?? refExpected);
    case 'exact':
      return String(response ?? '').trim() === String(refAnswer ?? refExpected ?? '').trim();
    case 'rubric':
    case 'external':
      // Human- or self-assessed: any non-empty response counts as completed.
      return normalizeText(response).length > 0;
    default: {
      // Dataset-authored items without an explicit contract mode.
      if (refAnswer !== undefined) return normalizeText(response) === normalizeText(refAnswer);
      if (refExpected !== undefined) return normalizeText(response) === normalizeText(refExpected);
      if (ev.rubric || ev.expected_points) return normalizeText(response).length > 0;
      const accepted = resp.accepted_answers || [refAnswer];
      return accepted.filter(Boolean).some((answer) => normalizeText(answer) === normalizeText(response));
    }
  }
}

// Grading for legacy exam_questions rows (answer may be choice text or key).
export function gradeExamQuestion(row, response) {
  const given = normalizeText(response);
  const answer = normalizeText(row.answer);
  if (given && given === answer) return true;
  let choices = row.choices_json ?? row.choices;
  if (typeof choices === 'string') {
    try { choices = JSON.parse(choices); } catch { choices = null; }
  }
  if (choices && typeof choices === 'object') {
    const entries = Array.isArray(choices) ? choices.map((c) => [c.key, c.text]) : Object.entries(choices);
    for (const [key, text] of entries) {
      if (String(key).toLowerCase() === String(response ?? '').trim().toLowerCase()) {
        return normalizeText(text) === answer || String(key).toLowerCase() === String(row.answer ?? '').trim().toLowerCase();
      }
      if (normalizeText(text) === given && normalizeText(text) === answer) return true;
    }
  }
  return false;
}

// Grading for legacy UD-generated exercise_items.
export function gradeExerciseItem(row, response) {
  if (row.exercise_type === 'word_order') {
    return normalizeText(response) === normalizeText(row.answer);
  }
  return normalizeText(response) === normalizeText(row.answer);
}

// Alignment is practice feedback, never a speaking grade.
export { speechFeedback } from '../shared/speech-feedback.js';
