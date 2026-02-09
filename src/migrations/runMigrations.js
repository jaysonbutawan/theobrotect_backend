const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        run_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = __dirname;

    const files = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query(
        "SELECT 1 FROM migrations WHERE name = $1",
        [file]
      );

      if (rowCount === 0) {
        console.log(`Running migration: ${file}`);

        const sql = fs.readFileSync(
          path.join(migrationsDir, file),
          "utf8"
        );

        await client.query(sql);
        await client.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          [file]
        );
      }
    }

    console.log("All migrations applied");
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations();