import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, movements, silos } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

type SiloInput = { id?: unknown; name?: unknown; product?: unknown; capacity?: unknown; minimumStock?: unknown; active?: unknown };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  return Response.json(await getDb().select().from(silos).orderBy(asc(silos.id)));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Cadastro de silos exclusivo do administrador." }, { status: 403 });
  const body = await req.json() as SiloInput;
  const name = String(body.name || "").trim(), product = String(body.product || "").trim();
  const capacity = Math.round(Number(body.capacity) * 1000), minimumStock = Math.round(Number(body.minimumStock) * 1000);
  if (!name || !product) return Response.json({ error: "Informe nome e produto." }, { status: 400 });
  if (!Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(minimumStock) || minimumStock < 0 || minimumStock > capacity) return Response.json({ error: "Capacidade ou estoque mínimo inválido." }, { status: 400 });
  const now = new Date().toISOString();
  const [row] = await getDb().insert(silos).values({ name, product, capacity, minimumStock, active: true, createdAt: now, updatedAt: now }).returning();
  await getDb().insert(audits).values({ action: "INCLUSÃO", entity: "SILO", entityId: row.id, details: JSON.stringify({ name, product, capacity: capacity / 1000, minimumStock: minimumStock / 1000 }), userEmail: user.email, createdAt: now });
  return Response.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Edição de silos exclusiva do administrador." }, { status: 403 });
  const body = await req.json() as SiloInput, id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Silo inválido." }, { status: 400 });
  const [current] = await getDb().select().from(silos).where(eq(silos.id, id)).limit(1);
  if (!current) return Response.json({ error: "Silo não encontrado." }, { status: 404 });
  const name = String(body.name ?? current.name).trim(), product = String(body.product ?? current.product).trim();
  const capacity = body.capacity === undefined ? current.capacity : Math.round(Number(body.capacity) * 1000);
  const minimumStock = body.minimumStock === undefined ? current.minimumStock : Math.round(Number(body.minimumStock) * 1000);
  if (!name || !product || !Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(minimumStock) || minimumStock < 0 || minimumStock > capacity) return Response.json({ error: "Dados do silo inválidos." }, { status: 400 });
  const siloMovements = await getDb().select().from(movements).where(eq(movements.siloId, id));
  const stock = siloMovements.reduce((sum, item) => sum + (item.type === "Saída" ? -item.qty : item.type === "Ajuste" && item.adjustmentDelta !== null ? item.adjustmentDelta : item.qty), 0);
  if (capacity < stock) return Response.json({ error: `A capacidade não pode ser menor que o estoque atual de ${(stock / 1000).toFixed(2)} t.` }, { status: 409 });
  const active = body.active === undefined ? current.active : Boolean(body.active), updatedAt = new Date().toISOString();
  await getDb().update(silos).set({ name, product, capacity, minimumStock, active, updatedAt }).where(eq(silos.id, id));
  await getDb().insert(audits).values({ action: "ALTERAÇÃO", entity: "SILO", entityId: id, details: JSON.stringify({ name, product, capacity: capacity / 1000, minimumStock: minimumStock / 1000, active }), userEmail: user.email, createdAt: updatedAt });
  return Response.json({ ok: true });
}
