import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const host = process.env.DATABASE_HOST ?? "127.0.0.1";
  const port = Number(process.env.DATABASE_PORT ?? 3306);
  const user = process.env.DATABASE_USER ?? "root";
  const password = process.env.DATABASE_PASSWORD ?? "";
  const database = process.env.DATABASE_NAME ?? "zuvigotodo";

  const root = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await root.end();

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tbl_schema_migrations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_tbl_schema_migrations_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const dir = path.resolve(process.cwd(), "infrastructure/database/migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const [appliedRows] = await conn.query<{ name: string }[] & mysql.RowDataPacket[]>(
    "SELECT name FROM tbl_schema_migrations"
  );
  const applied = new Set(appliedRows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await conn.query(sql);
    await conn.query("INSERT INTO tbl_schema_migrations (name) VALUES (?)", [file]);
  }

  await conn.end();
  console.log("Migrations complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
