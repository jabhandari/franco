import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || process.env.DATABASE_URL !== databaseUrl
  || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)) {
  throw new Error('DATABASE_URL and TEST_DATABASE_URL must match and point to local PostgreSQL.');
}
const { pool, migrate } = await import('../server/database.js');
const { createRoom, closeRoom, listHostedRooms, finishRoom, getRoom, pruneRaceRooms, RaceError } = await import('../server/races.js');
const userId = `race-test-${randomUUID()}`;
const otherUserId = `race-test-${randomUUID()}`;
const roomIds = [];

try {
  await migrate();
  await pool.query('INSERT INTO users(id,email,name,password_hash,password_salt) VALUES($1,$2,$3,$4,$5)',
    [userId, `${userId}@example.test`, 'Race Test', 'unused', 'unused']);
  await pool.query('INSERT INTO users(id,email,name,password_hash,password_salt) VALUES($1,$2,$3,$4,$5)',
    [otherUserId, `${otherUserId}@example.test`, 'Other Race Test', 'unused', 'unused']);
  const rooms = [];
  for (let index = 0; index < 3; index += 1) {
    const state = await createRoom(userId);
    rooms.push(state.room);
    roomIds.push((await pool.query('SELECT id FROM race_rooms WHERE code=$1', [state.room.code])).rows[0].id);
  }
  assert.equal((await listHostedRooms(userId)).length, 3, 'all cap-counted lobbies appear in dashboard');
  assert.deepEqual(await listHostedRooms(otherUserId), [], 'other users do not see hosted rooms');
  await assert.rejects(createRoom(userId), (error) => error instanceof RaceError
    && error.status === 429 && /open race rooms/.test(error.message));
  await assert.rejects(closeRoom(rooms[0].code, otherUserId), (error) => error instanceof RaceError && error.status === 403);
  await closeRoom(rooms[0].code, userId);
  assert.equal((await listHostedRooms(userId)).length, 2, 'closed lobby leaves dashboard');
  await assert.rejects(closeRoom(rooms[0].code, userId), (error) => error instanceof RaceError && error.status === 409);
  await assert.rejects(closeRoom(rooms[0].code, otherUserId), (error) => error instanceof RaceError && error.status === 409);
  const reopened = await createRoom(userId);
  rooms.push(reopened.room);
  roomIds.push((await pool.query('SELECT id FROM race_rooms WHERE code=$1', [reopened.room.code])).rows[0].id);

  for (const roomId of roomIds.slice(1, 3)) {
    await pool.query("UPDATE race_rooms SET status='live',started_at=NOW(),question_ids='[]'::jsonb WHERE id=$1", [roomId]);
    await pool.query('INSERT INTO race_players(id,room_id,display_name,seat,lives_left) VALUES($1,$2,$3,2,3)',
      [randomUUID(), roomId, 'Guest']);
  }
  await assert.rejects(closeRoom(rooms[1].code, otherUserId), (error) => error instanceof RaceError && error.status === 403);
  await assert.rejects(closeRoom(rooms[1].code, userId), (error) => error instanceof RaceError && error.status === 409);
  await assert.rejects(createRoom(userId), (error) => error instanceof RaceError
    && error.status === 429 && /open race rooms/.test(error.message));

  await finishRoom(rooms[1].code, userId);
  assert.equal((await listHostedRooms(userId)).length, 2, 'finished host no longer counts against open-room cap');
  // The guest can continue, but the host has finished and can host again.
  const next = await createRoom(userId);
  roomIds.push((await pool.query('SELECT id FROM race_rooms WHERE code=$1', [next.room.code])).rows[0].id);
  await pool.query("UPDATE race_players SET last_seen_at=NOW()-INTERVAL '11 minutes' WHERE room_id=$1 AND seat=2", [roomIds[1]]);
  await pool.query("UPDATE race_rooms SET ends_at=NOW()-INTERVAL '1 second' WHERE id=$1", [roomIds[2]]);
  await pruneRaceRooms();
  assert.equal((await pool.query('SELECT status FROM race_rooms WHERE id=$1', [roomIds[1]])).rows[0].status,
    'live', 'guest gets ten minutes to reconnect after host finishes');
  await pool.query("UPDATE race_players SET finished_at=NOW()-INTERVAL '11 minutes' WHERE room_id=$1 AND seat=1", [roomIds[1]]);
  await pruneRaceRooms();
  const finished = (await pool.query('SELECT status,question_ids FROM race_rooms WHERE id=$1', [roomIds[1]])).rows[0];
  assert.equal(finished.status, 'finished', 'abandoned opponent is settled without another room visit');
  assert.deepEqual(finished.question_ids, [], 'finished room no longer stores its question snapshot');
  // Reproduce the reported 1–0 result: the higher scorer ended early,
  // while the opponent ran out of lives. Both viewers must see the same winner.
  await pool.query(`UPDATE race_players SET correct_count=1,final_score=1,
    forfeited_at=finished_at,lives_left=1 WHERE room_id=$1 AND seat=1`, [roomIds[1]]);
  await pool.query(`UPDATE race_players SET user_id=$2,correct_count=0,final_score=0,
    forfeited_at=NULL,lives_left=0 WHERE room_id=$1 AND seat=2`, [roomIds[1], otherUserId]);
  const hostResult = await getRoom(rooms[1].code, userId);
  const guestResult = await getRoom(rooms[1].code, otherUserId);
  assert.equal(hostResult.room.winner_seat, 1);
  assert.equal(guestResult.room.winner_seat, 1);
  assert.equal(hostResult.me.seat, 1);
  assert.equal(guestResult.me.seat, 2);
  assert.equal(hostResult.opponent.correct_count, 0);
  assert.equal(guestResult.opponent.correct_count, 1);
  const timed = (await pool.query('SELECT status,question_ids FROM race_rooms WHERE id=$1', [roomIds[2]])).rows[0];
  assert.equal(timed.status, 'finished', 'elapsed clock settles without another room visit');
  assert.deepEqual(timed.question_ids, []);
  assert.equal((await listHostedRooms(userId)).length, 2, 'only the remaining open lobbies count');
  await closeRoom(reopened.room.code, userId);
  await closeRoom(next.room.code, userId);
  for (let index = roomIds.length; index < 10; index += 1) {
    const created = await createRoom(userId);
    roomIds.push((await pool.query('SELECT id FROM race_rooms WHERE code=$1', [created.room.code])).rows[0].id);
    await closeRoom(created.room.code, userId);
  }
  await assert.rejects(createRoom(userId), (error) => error instanceof RaceError
    && error.status === 429 && /10 race links/.test(error.message));
  console.log('Race lifecycle integration passed: hosted dashboard, closure, hourly and active caps, abandonment and timer cleanup.');
} finally {
  await pool.query('DELETE FROM race_rooms WHERE id=ANY($1)', [roomIds]);
  await pool.query('DELETE FROM users WHERE id=$1', [userId]);
  await pool.query('DELETE FROM users WHERE id=$1', [otherUserId]);
  await pool.end();
}
