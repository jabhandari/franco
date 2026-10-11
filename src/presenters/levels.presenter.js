// FRA-21 presenter: the shared CEFR level list. Single source of truth for
// the section tabs used by Session, Content, PastQuestions, and concepts.
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// FRA-50: static CEFR -> CLB correspondence for our Canadian PR audience
// (TEF/TCF Canada score equivalences; e.g. B2 ~= CLB 7). Zero runtime cost.
export const CLB_BY_CEFR = {
  A1: '1–2',
  A2: '3–4',
  B1: '5–6',
  B2: '7',
  C1: '8–9',
  C2: '10–12',
};

export function clbForCefr(level) {
  return Object.prototype.hasOwnProperty.call(CLB_BY_CEFR, level) ? CLB_BY_CEFR[level] : null;
}

// 'B2 (CLB 7)' style label for level cards; falls back to the bare level
// when the mapping has no entry.
export function formatLevelWithClb(level) {
  const clb = clbForCefr(level);
  return clb ? `${level} (CLB ${clb})` : level;
}
