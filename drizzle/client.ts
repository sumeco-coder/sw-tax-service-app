// drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { DATABASE_URL } from "@/env.server"; // if you don't use "@/", use "../env.server"


const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    // RDS requires SSL; this works reliably on serverless
    rejectUnauthorized: false,
  },
});


export const db = drizzle(pool, { schema });
