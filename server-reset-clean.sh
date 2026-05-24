#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/www/wwwroot/ioftv"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-postgres}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-123456}"

echo "WARNING: this will delete app files under ${APP_DIR} and clear PostgreSQL business data."
echo "Type YES to continue:"
read -r CONFIRM

if [[ "${CONFIRM}" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

if [[ -d "${APP_DIR}" ]]; then
  pm2 delete ioftv 2>/dev/null || true
  pm2 delete ioftv-node 2>/dev/null || true

  find "${APP_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
else
  echo "App dir not found: ${APP_DIR}"
fi

export PGPASSWORD

node <<'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        component_qc_record_items,
        component_qc_records,
        component_outbound_records,
        component_reinspection_tasks,
        project_statistics,
        components,
        projects,
        rankings
      RESTART IDENTITY CASCADE
    `);
    await client.query(`DELETE FROM groups`);
    await client.query(`
      UPDATE star
      SET group_id = NULL,
          group_name = '',
          photo_url = '/people.jpg',
          passing_rate = 0,
          first_pass_rate = 0,
          photo_updated_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    await client.query('COMMIT');
    console.log('Database business data cleared.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
EOF

echo "Done."
