// env.server.ts
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const DATABASE_URL = required("DATABASE_URL");
