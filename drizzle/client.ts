// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

// AWS runtime detection (Amplify/Lambda)
const isAws =
  !!process.env.AWS_REGION ||
  !!process.env.AWS_DEFAULT_REGION ||
  !!process.env.AWS_EXECUTION_ENV ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const pemPath = path.join(process.cwd(), "certs", "global-bundle.pem");

const ssl = isAws
  ? {
      ca: fs.readFileSync(pemPath, "utf8"),
      rejectUnauthorized: true,
    }
  : undefined;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl,
});

export const db = drizzle(pool, { schema });