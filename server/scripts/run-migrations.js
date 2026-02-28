const fs = require("fs");
const path = require("path");

async function run() {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const { Client } = require("pg");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const migrationDir = path.join(__dirname, "../migrations");
    const files = fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
      await client.query(sql);
      console.log(`applied ${file}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
