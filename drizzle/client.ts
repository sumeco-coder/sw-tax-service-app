// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const isProd = process.env.NODE_ENV === "production";

// Remove sslmode from the URL if present (we control SSL via the `ssl` option)
let connectionString = DATABASE_URL;
try {
  const u = new URL(DATABASE_URL);
  u.searchParams.delete("sslmode");
  connectionString = u.toString();
} catch {
  // ignore if DATABASE_URL isn't a standard URL
}

const pemPath = path.join(process.cwd(), "certs", "us-west-1-bundle.pem");

const ssl = isProd
  ? {
      ca: fs.readFileSync(pemPath, "utf8"),
      rejectUnauthorized: true,
    }
  : undefined;

const pool = new Pool({ connectionString, ssl });
export const db = drizzle(pool, { schema });
