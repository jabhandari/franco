// Pure helpers for storing and displaying user names.
//
// The users table keeps `name` as the derived display name ("First Last")
// plus separate first_name / last_name columns. Rows that predate the
// columns are backfilled from `name` on a best-effort basis (see migrate()
// in database.js): the first token becomes first_name, everything after it
// becomes last_name. Single-token legacy names (e.g. an email prefix from the
// old signup default) become first_name with last_name NULL.

// Split a legacy display name into [firstName, lastName]. Never throws.
export function splitLegacyName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [null, null];
  if (parts.length === 1) return [parts[0], null];
  return [parts[0], parts.slice(1).join(' ')];
}

// Derived display name from the two stored parts ("Marie Curie").
export function displayName(firstName, lastName) {
  return [String(firstName ?? '').trim(), String(lastName ?? '').trim()]
    .filter(Boolean)
    .join(' ');
}

// Non-empty after trimming; used to validate name input on signup/profile.
export function isNonEmptyName(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
