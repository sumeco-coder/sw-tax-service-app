// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Read the AWS RDS CA bundle
const ca = fs.readFileSync(
  path.join(process.cwd(), "certs", "rds-ca.pem"),
  "utf8"
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca,
    rejectUnauthorized: true, // extra safety for pg
  },
});

export const db = drizzle(pool, { schema });
