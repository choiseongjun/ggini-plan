import pg from 'pg';

// Run with: node --env-file=.env.local scripts/migrate-local-data.mjs
// Keep the local database intact; merge into the isolated application schema.
const source = new pg.Client({ connectionString: process.env.DATABASE_URL_LOCAL });
const target = new pg.Client({ connectionString: process.env.DATABASE_URL });
const quote = (s) => '"' + s.replaceAll('"', '""') + '"';
const tables = ['users', 'oauth_accounts', 'sessions', 'oauth_login_attempts',
  'body_profiles', 'catalog_items', 'meal_plans', 'community_posts',
  'community_tips', 'community_likes', 'community_challenges',
  'challenge_members', 'challenge_checks', 'community_baskets',
  'weekly_budgets', 'daily_expenses'];
const value = (v) => v !== null && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v) && !Array.isArray(v) ? JSON.stringify(v) : v;
try {
  if (!process.env.DATABASE_URL_LOCAL || !process.env.DATABASE_URL) throw new Error('Both database URLs are required');
  await source.connect();
  await target.connect();
  if ((await target.query('select current_schema() as name')).rows[0].name !== 'kkiniplan') throw new Error('Target must be kkiniplan');
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await target.query('BEGIN');
  await target.query('SET LOCAL lock_timeout = \'10s\'');
  await target.query('LOCK TABLE ' + tables.map(quote).join(',') + ' IN SHARE ROW EXCLUSIVE MODE');
  const actual = (await source.query("select table_name from information_schema.tables where table_schema=current_schema() and table_type='BASE TABLE'")).rows.map(r => r.table_name);
  if (actual.some(t => !tables.includes(t))) throw new Error('Unexpected source tables; review before migrating');
  const users = new Map();
  const report = {};
  for (const table of tables) {
    const rows = (await source.query('SELECT * FROM ' + quote(table))).rows;
    const keys = (await target.query(`SELECT a.attname FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
      WHERE i.indrelid=$1::regclass AND i.indisprimary ORDER BY a.attnum`, [table])).rows.map(r => r.attname);
    let copied = 0, retained = 0;
    for (const original of rows) {
      const row = { ...original };
      if (table === 'users') {
        const existing = (await target.query('SELECT * FROM users WHERE email=$1', [row.email])).rows[0];
        if (existing) {
          users.set(String(row.id), existing.id);
          if (!existing.password_hash && row.password_hash) await target.query('UPDATE users SET password_hash=$1 WHERE id=$2', [row.password_hash, existing.id]);
          retained++;
          continue;
        }
        // Retain source IDs when free; fail rather than attach records to another user.
        const collision = (await target.query('SELECT 1 FROM users WHERE id=$1', [row.id])).rowCount;
        if (collision) throw new Error('User ID collision requires explicit remapping');
        users.set(String(row.id), row.id);
      }
      for (const field of ['user_id', 'updated_by']) {
        if (row[field] != null) {
          const mapped = users.get(String(row[field]));
          if (!mapped) throw new Error('Unmapped user reference in ' + table);
          row[field] = mapped;
        }
      }
      const where = keys.map((k, i) => `${quote(k)}=$${i + 1}`).join(' AND ');
      const existing = (await target.query(`SELECT * FROM ${quote(table)} WHERE ${where}`, keys.map(k => row[k]))).rows[0];
      if (existing && table === 'catalog_items') {
        // Preserve newer online admin edits; restore the original editor on identical snapshots.
        if (new Date(existing.updated_at) > new Date(row.updated_at)) { retained++; continue; }
      } else if (existing) {
        const fields = Object.keys(row);
        const equal = (await target.query(`SELECT 1 FROM ${quote(table)} WHERE ` + fields.map((k, i) => `${quote(k)} IS NOT DISTINCT FROM $${i + 1}`).join(' AND '), fields.map(k => value(row[k])))).rowCount;
        if (!equal) throw new Error('Conflicting existing record in ' + table);
        retained++;
        continue;
      }
      const fields = Object.keys(row);
      await target.query(`INSERT INTO ${quote(table)} (${fields.map(quote).join(',')}) VALUES (${fields.map((_, i) => '$' + (i + 1)).join(',')}) ON CONFLICT (${keys.map(quote).join(',')}) DO UPDATE SET ` + fields.filter(k => !keys.includes(k)).map(k => `${quote(k)}=EXCLUDED.${quote(k)}`).join(','), fields.map(k => value(row[k])));
      const verified = (await target.query(`SELECT 1 FROM ${quote(table)} WHERE ` + fields.map((k, i) => `${quote(k)} IS NOT DISTINCT FROM $${i + 1}`).join(' AND '), fields.map(k => value(row[k])))).rowCount;
      if (verified !== 1) throw new Error('Verification failed for ' + table);
      copied++;
    }
    report[table] = { source: rows.length, copied, retained, target: Number((await target.query('SELECT count(*) FROM ' + quote(table))).rows[0].count) };
  }
  for (const table of ['users', 'meal_plans', 'community_posts', 'community_tips']) {
    await target.query(`SELECT setval(pg_get_serial_sequence($1,'id'), GREATEST(COALESCE((SELECT max(id) FROM ${quote(table)}),1), (SELECT last_value FROM ${quote(table + '_id_seq')})), true)`, [table]);
  }
  await target.query('COMMIT');
  await source.query('COMMIT');
  console.log(JSON.stringify({ committed: true, tables: report }, null, 2));
} catch (error) {
  await target.query('ROLLBACK').catch(() => {});
  await source.query('ROLLBACK').catch(() => {});
  console.error('Migration stopped:', error.message);
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
