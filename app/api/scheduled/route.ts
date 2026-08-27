import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, scheduledLoads, silos } from "../../../db/schema";
import { requireClient } from "../../client-access";

export async function GET(req: Request) {
  const access = await requireClient(req); if ("error" in access) return access.error;
  const clientSilos = await getDb().select({ id: silos.id }).from(silos).where(eq(silos.clientId, access.clientId));
  if (!clientSilos.length) return Response.json([]);
  return Response.json(await getDb().select().from(scheduledLoads).where(inArray(scheduledLoads.siloId, clientSilos.map(row => row.id))).orderBy(desc(scheduledLoads.id)));
}

export async function POST(req: Request) {
  const access = await requireClient(req); if ("error" in access) return access.error;
  const { user, clientId } = access;
  const body = await req.json() as Record<string, unknown>, qty = Math.round(Number(body.qty) * 1000), siloId = Number(body.siloId);
  const [silo] = await getDb().select().from(silos).where(and(eq(silos.id, siloId), eq(silos.clientId, clientId))).limit(1);
  if (!silo || !silo.active) return Response.json({ error: "Selecione um silo ativo." }, { status: 400 });
  if (!qty || qty <= 0) return Response.json({ error: "Quantidade inválida." }, { status: 400 });
  const [row] = await getDb().insert(scheduledLoads).values({ date: String(body.date), qty, doc: String(body.doc), vehicle: String(body.vehicle).toUpperCase(), status: "Programada", owner: user.name, siloId, createdAt: new Date().toISOString() }).returning();
  await getDb().insert(audits).values({ action: "INCLUSÃO", entity: "CARGA PROGRAMADA", entityId: row.id, details: JSON.stringify({ ...body, siloId }), userEmail: user.email, clientId, createdAt: new Date().toISOString() });
  return Response.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const access = await requireClient(req); if ("error" in access) return access.error;
  const { user, clientId } = access;
  const body = await req.json() as { id?: unknown; status?: unknown }, id = Number(body.id), status = String(body.status);
  if (!["Programada", "Em trânsito", "Recebida", "Cancelada"].includes(status)) return Response.json({ error: "Status inválido." }, { status: 400 });
  const [load] = await getDb().select().from(scheduledLoads).where(eq(scheduledLoads.id, id)).limit(1);
  if (!load) return Response.json({ error: "Programação não encontrada." }, { status: 404 });
  const [silo] = await getDb().select().from(silos).where(and(eq(silos.id, load.siloId), eq(silos.clientId, clientId))).limit(1);
  if (!silo) return Response.json({ error: "Programação não pertence ao cliente selecionado." }, { status: 403 });
  await getDb().update(scheduledLoads).set({ status }).where(eq(scheduledLoads.id, id));
  await getDb().insert(audits).values({ action: "ALTERAÇÃO", entity: "CARGA PROGRAMADA", entityId: id, details: JSON.stringify({ status }), userEmail: user.email, clientId, createdAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
