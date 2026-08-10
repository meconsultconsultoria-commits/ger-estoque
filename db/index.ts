import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  const binding = (globalThis as typeof globalThis & { __SILO_DB?: D1Database }).__SILO_DB;
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure o binding no wrangler.jsonc antes de usar o banco."
    );
  }

  return drizzle(binding, { schema });
}
