/** Cloudflare Worker entry point for GER outside ChatGPT Sites. */
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    (globalThis as typeof globalThis & { __SILO_DB?: D1Database }).__SILO_DB = env.DB;
    return handler.fetch(request, env, ctx);
  },
};
