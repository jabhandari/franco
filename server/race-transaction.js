// A deadlock victim is rolled back by PostgreSQL. Retry the whole transaction,
// never an individual statement, so seat allocation and answers remain atomic.
export async function raceTransaction(pool, work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const value = await work(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code !== '40P01') throw error;
      if (attempt === 2) {
        throw new Error('The race is busy. Please try again in a moment.');
      }
    } finally { client.release(); }
    await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
  }
}
