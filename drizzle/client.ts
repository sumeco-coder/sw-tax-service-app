// drizzle/client.ts
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

// In Amplify SSR, process.cwd() is typically /tmp/app.
// Your repo files (including certs/) live under that.
const region = process.env.AWS_REGION || "us-west-1";
const certDir = path.resolve(process.cwd(), "certs");

// Prefer region bundle first, then global bundle.
// (Do NOT prioritize NODE_EXTRA_CA_CERTS here)
const candidates = [
  path.join(certDir, `${region}-bundle.pem`),   // /tmp/app/certs/us-west-1-bundle.pem
  path.join(certDir, "global-bundle.pem"),
];

const caPath = candidates.find((p) => fs.existsSync(p));
if (!caPath) {
  throw new Error(`[db] Missing RDS CA bundle. Checked: ${candidates.join(", ")}`);
}

const ca = fs.readFileSync(caPath, "utf8");

// Reuse pool in dev/hot reload
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl: { ca, rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });

