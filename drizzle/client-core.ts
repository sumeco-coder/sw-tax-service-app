// drizzle/client-core.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const isAws =
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.AWS_EXECUTION_ENV ||
  !!process.env.AWS_REGION;

const region = process.env.AWS_REGION || "us-west-1";
const certDir = path.resolve(process.cwd(), "certs");

const candidates = [
  path.join(certDir, `${region}-bundle.pem`),
  path.join(certDir, "global-bundle.pem"),
];

const caPath = candidates.find((p) => fs.existsSync(p));
if (!caPath) {
  throw new Error(`[db] Missing RDS CA bundle. Checked: ${candidates.join(", ")}`);
}

const ca = fs.readFileSync(caPath, "utf8");

const ssl = ca
  ? { ca, rejectUnauthorized: true }
  : isAws
  ? { rejectUnauthorized: false }
  : undefined;

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
