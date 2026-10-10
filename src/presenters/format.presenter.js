// FRA-21 presenter: pure string formatting helpers. No JSX, no hooks,
// no side effects. safeText/formatEnum/getErrorMessage were moved verbatim
// from src/api/client.js (re-exported there for compatibility).

/**
 * Render unknown API values safely. Learners never see raw JSON or
 * "[object Object]": objects, arrays, and booleans collapse to the fallback.
 * @param {*} value
 * @param {string} [fallback='']
 * @returns {string}
 */
export function safeText(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

/**
 * "not_started" -> "Not Started". Never throws on non-string input.
 * @param {*} value
 * @returns {string}
 */
export function formatEnum(value) {
  const text = safeText(value).trim();
  if (!text) return '';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize any caught error into a concise learner-facing message.
 * @param {*} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  const message = error && safeText(error.message).trim();
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

/**
 * Underscore-separated machine names -> human words ("writing_prompt" ->
 * "writing prompt"). Null-safe: null/undefined collapse to ''.
 * @param {*} value
 * @returns {string}
 */
export function humanize(value) {
  return safeText(value).replace(/_/g, ' ');
}

/**
 * Capitalize the first character ("reading" -> "Reading"). Null-safe.
 * @param {*} str
 * @returns {string}
 */
export function capitalize(str) {
  const text = safeText(str);
  if (!text) return '';
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * Zero-pad a number (padNumber(3) -> "03"). Replaces the
 * String(index + 1).padStart(2, '0') road-map node labels.
 * @param {*} n
 * @param {number} [width=2]
 * @returns {string}
 */
export function padNumber(n, width = 2) {
  return String(n).padStart(width, '0');
}

/**
 * Button label for a choice ("A. Paris"). Replaces the JSX-fragment labels
 * (<>{choice.key}. {choice.text}</>) — a plain string renders identically
 * as a button label.
 * @param {{key: *, text: *}} choice
 * @returns {string}
 */
export function choiceLabel(choice) {
  return `${choice.key}. ${choice.text}`;
}
