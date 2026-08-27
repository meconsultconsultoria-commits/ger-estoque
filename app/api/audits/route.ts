import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits } from "../../../db/schema";
import { requireClient } from "../../client-access";

export async function GET(req: Request) {
  const access = await requireClient(req);
  if ("error" in access) return access.error;
  if (access.user.role !== "admin") return Response.json([], { status: 403 });
  return Response.json(await getDb().select().from(audits).where(eq(audits.clientId, access.clientId)).orderBy(desc(audits.id)).limit(300));
}
