import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, scheduledLoads, silos } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  return Response.json(await getDb().select().from(scheduledLoads).orderBy(desc(scheduledLoads.id)));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  const body = await req.json() as Record<string, unknown>, qty = Math.round(Number(body.qty) * 1000), siloId = Number(body.siloId);
  const [silo] = await getDb().select().from(silos).where(eq(silos.id, siloId)).limit(1);
  if (!silo || !silo.active) return Response.json({ error: "Selecione um silo ativo." }, { status: 400 });
  if (!qty || qty <= 0) return Response.json({ error: "Quantidade inválida." }, { status: 400 });
  const [row] = await getDb().insert(scheduledLoads).values({ date: String(body.date), qty, doc: String(body.doc), vehicle: String(body.vehicle).toUpperCase(), status: "Programada", owner: user.name, siloId, createdAt: new Date().toISOString() }).returning();
  await getDb().insert(audits).values({ action: "INCLUSÃO", entity: "CARGA PROGRAMADA", entityId: row.id, details: JSON.stringify({ ...body, siloId }), userEmail: user.email, createdAt: new Date().toISOString() });
  return Response.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  const body = await req.json() as { id?: unknown; status?: unknown }, id = Number(body.id), status = String(body.status);
  if (!["Programada", "Em trânsito", "Recebida", "Cancelada"].includes(status)) return Response.json({ error: "Status inválido." }, { status: 400 });
  await getDb().update(scheduledLoads).set({ status }).where(eq(scheduledLoads.id, id));
  await getDb().insert(audits).values({ action: "ALTERAÇÃO", entity: "CARGA PROGRAMADA", entityId: id, details: JSON.stringify({ status }), userEmail: user.email, createdAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
