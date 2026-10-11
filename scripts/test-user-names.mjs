import assert from 'node:assert/strict';

const { splitLegacyName, displayName, isNonEmptyName } = await import('../server/user-names.js');

// Legacy backfill: first token -> first_name, rest -> last_name.
assert.deepEqual(splitLegacyName('Marie Curie'), ['Marie', 'Curie']);
assert.deepEqual(splitLegacyName('Jean Claude Van Damme'), ['Jean', 'Claude Van Damme']);
assert.deepEqual(splitLegacyName('  Jean   Claude  '), ['Jean', 'Claude']);
assert.deepEqual(splitLegacyName('Madonna'), ['Madonna', null]); // old email-prefix default
assert.deepEqual(splitLegacyName(''), [null, null]);
assert.deepEqual(splitLegacyName('   '), [null, null]);
assert.deepEqual(splitLegacyName(null), [null, null]);
assert.deepEqual(splitLegacyName(undefined), [null, null]);

// Display name derives from the two stored parts.
assert.equal(displayName('Marie', 'Curie'), 'Marie Curie');
assert.equal(displayName('  Marie ', ' Curie  '), 'Marie Curie');
assert.equal(displayName('Marie', ''), 'Marie');
assert.equal(displayName('', 'Curie'), 'Curie');

// Non-empty validation for signup / profile input.
assert.equal(isNonEmptyName('Marie'), true);
assert.equal(isNonEmptyName('  x  '), true);
assert.equal(isNonEmptyName(''), false);
assert.equal(isNonEmptyName('   '), false);
assert.equal(isNonEmptyName(null), false);
assert.equal(isNonEmptyName(undefined), false);
assert.equal(isNonEmptyName(42), false);

console.log('user names tests passed');
