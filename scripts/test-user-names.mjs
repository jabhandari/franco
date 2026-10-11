import assert from 'node:assert/strict';

const { displayName, isNonEmptyName } = await import('../server/user-names.js');

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
