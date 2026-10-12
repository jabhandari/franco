// FRA-21 presenter: pure string formatting helpers. No JSX, no hooks,
// no side effects. safeText/formatEnum/getErrorMessage were moved verbatim
// from src/api/client.js (re-exported there for compatibility).

/**
 * Untrusted JSON-ish value at the render boundary. Used ONLY by the
 * defensive safeText/isRecord utilities below — never as a domain type.
 * Domain types (AttemptResult, ExerciseEntry, API response shapes) define
 * their own specific fields instead of reaching for this.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Narrow a JSON value (or caught error) to a plain string-keyed record.
 * Arrays are not records. Lets callers avoid `as` assertions at the render
 * boundary. Error instances pass (they are non-array objects) so their
 * `message` field stays readable.
 */
export function isRecord(value: JsonValue | Error): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Render JSON values safely. Learners never see raw JSON or
 * "[object Object]": objects, arrays, and booleans collapse to the fallback.
 */
export function safeText(value: JsonValue, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

/**
 * "not_started" -> "Not Started". Never throws on non-string input.
 */
export function formatEnum(value: JsonValue): string {
  const text = safeText(value).trim();
  if (!text) return '';
  return text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize any caught error into a concise learner-facing message.
 * Catch clauses can throw anything; in this codebase that is JSON-ish
 * values or Error instances (fetch TypeErrors, SyntaxError from JSON.parse).
 */
export function getErrorMessage(error: JsonValue | Error): string {
  const message = isRecord(error) && 'message' in error
    ? safeText(error.message).trim()
    : '';
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

/**
 * Underscore-separated machine names -> human words ("writing_prompt" ->
 * "writing prompt"). Null-safe: null/undefined collapse to ''.
 */
export function humanize(value: JsonValue): string {
  return safeText(value).replace(/_/g, ' ');
}

/**
 * Capitalize the first character ("reading" -> "Reading"). Null-safe.
 */
export function capitalize(str: JsonValue): string {
  const text = safeText(str);
  if (!text) return '';
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * Zero-pad a number (padNumber(3) -> "03"). Replaces the
 * String(index + 1).padStart(2, '0') road-map node labels.
 */
export function padNumber(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/** A choice object as consumed by choiceLabel (key/text may be raw API values). */
export type ChoiceLike = {
  key: JsonValue;
  text: JsonValue;
};

/**
 * Button label for a choice ("A. Paris"). Replaces the JSX-fragment labels
 * (<>{choice.key}. {choice.text}</>) — a plain string renders identically
 * as a button label.
 */
export function choiceLabel(choice: ChoiceLike): string {
  return `${choice.key}. ${choice.text}`;
}
