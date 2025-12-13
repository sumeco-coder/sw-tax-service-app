// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const isAws = !!process.env.AWS_REGION; 

// Only load the CA bundle when needed (RDS/Aurora SSL)
const ssl = isProd
  ? {
      ca: fs.readFileSync(path.join(process.cwd(), "certs", "rds-ca.pem"), "utf8"),
      rejectUnauthorized: true,
    }
  : undefined;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl,
});

export const db = drizzle(pool, { schema });
