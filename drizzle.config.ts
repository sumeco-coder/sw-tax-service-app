// drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",

  dbCredentials: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,

    // ✅ REQUIRED for RDS setups enforcing SSL (fixes "no encryption")
    ssl: { rejectUnauthorized: false },
  },

  strict: true,
  verbose: true,
});
