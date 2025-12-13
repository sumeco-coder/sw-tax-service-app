import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const isProd = process.env.NODE_ENV === "production";

const candidates = [
  path.join(process.cwd(), "certs", "global-bundle.pem"),
 
];

const caPath = candidates.find((p) => fs.existsSync(p));
if (isProd && !caPath) throw new Error("No RDS CA bundle found in /certs");

const ssl = isProd
  ? { ca: fs.readFileSync(caPath!, "utf8"), rejectUnauthorized: true }
  : undefined;

console.log("DB_SSL_DEBUG", {
  nodeEnv: process.env.NODE_ENV,
  cwd: process.cwd(),
  caPath,
  caBytes: caPath ? fs.statSync(caPath).size : 0,
});

const pool = new Pool({ connectionString: DATABASE_URL, ssl });
export const db = drizzle(pool, { schema });
