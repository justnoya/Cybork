const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

/**
 * Wrap a plain object so it has a non-enumerable .save() that upserts
 * the object's current state to the given table's JSONB data column.
 */
function makeSaveable(tableName, idValue, obj) {
  Object.defineProperty(obj, "save", {
    enumerable: false,
    configurable: true,
    writable: true,
    value: async () => {
      const snapshot = JSON.parse(JSON.stringify(obj));
      await pool.query(
        `INSERT INTO "${tableName}" (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
           SET data = $2::jsonb, updated_at = NOW()`,
        [idValue, JSON.stringify(snapshot)]
      );
    },
  });
  return obj;
}

module.exports = { pool, makeSaveable };
