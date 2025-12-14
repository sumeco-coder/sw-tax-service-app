// drizzle/client.ts


import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const caPath = path.resolve(process.cwd(), 'certs/global-bundle.pem');

if (!fs.existsSync(caPath)) {
  throw new Error(`Missing RDS CA bundle at ${caPath}`);
}

const ca = fs.readFileSync(caPath, "utf8");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: ca,
  },
});

export const db = drizzle(pool, { schema });
