import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, movements, scheduledLoads, silos } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

type MovementInput = { date?: unknown; type?: unknown; qty?: unknown; doc?: unknown; vehicle?: unknown; reason?: unknown; scheduledLoadId?: unknown; siloId?: unknown };
const movementEffect = (item: { type: string; qty: number; adjustmentDelta?: number | null }) => item.type === "Saída" ? -item.qty : item.type === "Ajuste" && item.adjustmentDelta !== null && item.adjustmentDelta !== undefined ? item.adjustmentDelta : item.qty;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  return Response.json(await getDb().select().from(movements).orderBy(desc(movements.id)).limit(1000));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  const body = await req.json() as MovementInput;
  const type = String(body.type) as "Entrada" | "Saída" | "Ajuste", qty = Math.round(Number(body.qty) * 1000), scheduledLoadId = body.scheduledLoadId ? Number(body.scheduledLoadId) : null, siloId = Number(body.siloId);
  if (!Number.isFinite(qty) || qty < 0 || (type !== "Ajuste" && qty === 0)) return Response.json({ error: "Quantidade inválida." }, { status: 400 });
  if (!["Entrada", "Saída", "Ajuste"].includes(type)) return Response.json({ error: "Tipo de movimentação inválido." }, { status: 400 });
  const [silo] = await getDb().select().from(silos).where(eq(silos.id, siloId)).limit(1);
  if (!silo || !silo.active) return Response.json({ error: "Selecione um silo ativo." }, { status: 400 });
  if (scheduledLoadId) {
    const [load] = await getDb().select().from(scheduledLoads).where(eq(scheduledLoads.id, scheduledLoadId)).limit(1);
    if (!load) return Response.json({ error: "Programação não encontrada." }, { status: 404 });
    if (load.status !== "Recebida" || type !== "Entrada") return Response.json({ error: "A programação precisa estar Recebida e gerar uma entrada." }, { status: 400 });
    if (load.doc !== String(body.doc) || load.siloId !== siloId) return Response.json({ error: "Documento ou silo não corresponde à programação." }, { status: 400 });
  }
  if (type === "Ajuste" && user.role !== "admin") return Response.json({ error: "Ajustes são exclusivos do administrador." }, { status: 403 });
  if (type === "Ajuste" && !String(body.reason || "").trim()) return Response.json({ error: "Informe a justificativa do ajuste." }, { status: 400 });
  const siloMovements = await getDb().select().from(movements).where(eq(movements.siloId, siloId));
  const stock = siloMovements.reduce((sum, item) => sum + movementEffect(item), 0), adjustmentDelta = type === "Ajuste" ? qty - stock : null;
  const next = type === "Ajuste" ? qty : stock + (type === "Saída" ? -qty : qty);
  if (next < 0 || next > silo.capacity) return Response.json({ error: next < 0 ? "Saída superior ao estoque deste silo." : `Capacidade de ${(silo.capacity / 1000).toFixed(2)} t do ${silo.name} excedida.` }, { status: 400 });
  try {
    const [row] = await getDb().insert(movements).values({ date: String(body.date), type, qty, doc: String(body.doc), vehicle: String(body.vehicle).toUpperCase(), owner: user.name, ownerEmail: user.email, reason: body.reason ? String(body.reason) : null, adjustmentDelta, scheduledLoadId, siloId, createdAt: new Date().toISOString() }).returning();
    await getDb().insert(audits).values({ action: "INCLUSÃO", entity: "MOVIMENTAÇÃO", entityId: row.id, details: JSON.stringify({ type, qty: body.qty, siloId, adjustmentDelta: adjustmentDelta === null ? null : adjustmentDelta / 1000, doc: body.doc, scheduledLoadId }), userEmail: user.email, createdAt: new Date().toISOString() });
    return Response.json(row, { status: 201 });
  } catch (error) {
    if (scheduledLoadId && String(error).includes("UNIQUE")) return Response.json({ error: "Esta programação já possui uma entrada registrada." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "A exclusão é exclusiva do administrador." }, { status: 403 });
  const { id } = await req.json() as { id?: unknown }, movementId = Number(id);
  if (!Number.isInteger(movementId) || movementId <= 0) return Response.json({ error: "Lançamento inválido." }, { status: 400 });
  const [row] = await getDb().select().from(movements).where(eq(movements.id, movementId)).limit(1);
  if (!row) return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const [silo] = await getDb().select().from(silos).where(eq(silos.id, row.siloId)).limit(1);
  const siloMovements = await getDb().select().from(movements).where(eq(movements.siloId, row.siloId));
  const stock = siloMovements.reduce((sum, item) => sum + movementEffect(item), 0), resultingStock = stock - movementEffect(row);
  if (resultingStock < 0 || resultingStock > silo.capacity) return Response.json({ error: resultingStock < 0 ? "A exclusão deixaria o estoque negativo." : "A exclusão faria o estoque exceder a capacidade do silo." }, { status: 409 });
  await getDb().delete(movements).where(eq(movements.id, movementId));
  await getDb().insert(audits).values({ action: "EXCLUSÃO", entity: "MOVIMENTAÇÃO", entityId: row.id, details: JSON.stringify({ date: row.date, type: row.type, qty: row.qty / 1000, siloId: row.siloId, doc: row.doc, vehicle: row.vehicle, scheduledLoadId: row.scheduledLoadId }), userEmail: user.email, createdAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
