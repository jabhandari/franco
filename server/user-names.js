// Pure helpers for storing and displaying user names.
//
// The users table keeps `name` as the derived display name ("First Last")
// plus separate first_name / last_name columns.

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
