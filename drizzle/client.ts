// drizzle/client.ts
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const isHosted =
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.AWS_EXECUTION_ENV?.includes("AWS_Lambda") === true;

const region = process.env.AWS_REGION; // e.g. "us-west-1"
const envCa = process.env.NODE_EXTRA_CA_CERTS;

// Prefer /var/task in Lambda, repo path locally
const baseDir = isHosted
  ? "/var/task/certs"
  : path.resolve(process.cwd(), "certs");

// Region-first, then global (plus optional NODE_EXTRA_CA_CERTS if you set it)
const candidates = [
  envCa && fs.existsSync(envCa) ? envCa : undefined,
  region ? path.join(baseDir, `${region}-bundle.pem`) : undefined, // certs/us-west-1-bundle.pem
  path.join(baseDir, "global-bundle.pem"),
].filter(Boolean) as string[];

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
