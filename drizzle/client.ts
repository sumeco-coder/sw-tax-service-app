// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

// In Amplify/Lambda, safest path is /var/task (where the app is deployed)
const isAws = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.AWS_EXECUTION_ENV;

const pemPath = isAws
  ? "/var/task/certs/us-west-1-bundle.pem"
  : path.join(process.cwd(), "certs", "us-west-1-bundle.pem");

const ssl = {
  ca: fs.readFileSync(pemPath, "utf8"),
  rejectUnauthorized: true,
};

console.log("DB SSL debug", {
  isAws,
  pemPath,
  pemExists: fs.existsSync(pemPath),
  pemBytes: fs.existsSync(pemPath) ? fs.statSync(pemPath).size : 0,
});

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl,
});

export const db = drizzle(pool, { schema });
