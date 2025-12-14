import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

// ✅ Pick ONE cert file path (recommended: global)
const pemPath =
  process.env.RDS_CA_BUNDLE_PATH ||
  path.join(process.cwd(), "certs", "global-bundle.pem"); // OR "us-west-1-bundle.pem"

// ✅ Never crash build if file is missing. Only use SSL CA when it exists.
const ssl = fs.existsSync(pemPath)
  ? { ca: fs.readFileSync(pemPath, "utf8"), rejectUnauthorized: true }
  : undefined;

const pool = new Pool({ connectionString: DATABASE_URL, ssl });

export const db = drizzle(pool, { schema });
