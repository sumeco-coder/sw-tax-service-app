// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import { DATABASE_URL } from "@/env.server";



// Read the AWS RDS CA bundle
const ca = fs.readFileSync(
  path.join(process.cwd(), "certs", "rds-ca.pem"),
  "utf8"
);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    ca,
    rejectUnauthorized: true, // extra safety for pg
  },
});

export const db = drizzle(pool, { schema });
