// drizzle/client.ts
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

// ---- TEMP DEBUG (safe) ----
const cwd = process.cwd();
const envCa = process.env.NODE_EXTRA_CA_CERTS;

const rootCa = path.resolve(cwd, "certs", "global-bundle.pem");
const altNextCa = path.resolve(cwd, ".next", "certs", "global-bundle.pem");

console.log("[db] cwd:", cwd);
console.log("[db] NODE_EXTRA_CA_CERTS:", envCa || "(not set)");
console.log("[db] env ca exists?:", envCa ? fs.existsSync(envCa) : false);
console.log("[db] root ca exists?:", fs.existsSync(rootCa), rootCa);
console.log("[db] alt .next ca exists?:", fs.existsSync(altNextCa), altNextCa);
// ---- END TEMP DEBUG ----

// Pick the first CA path that actually exists
const caPath =
  (envCa && fs.existsSync(envCa) && envCa) ||
  (fs.existsSync(rootCa) && rootCa) ||
  (fs.existsSync(altNextCa) && altNextCa);

if (!caPath) {
  throw new Error(
    `[db] Missing RDS CA bundle. Checked env(${envCa}), ${rootCa}, ${altNextCa}`
  );
}

console.log("[db] using CA path:", caPath);

const ca = fs.readFileSync(caPath, "utf8");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
});

export const db = drizzle(pool, { schema });
