export function getD1(): D1Database {
  const binding = (globalThis as typeof globalThis & { __SILO_DB?: D1Database }).__SILO_DB;
  if (!binding) throw new Error("Cloudflare D1 binding `DB` indisponível.");
  return binding;
}
