import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, clients, userClients } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

const colorPattern = /^#[0-9a-f]{6}$/i;
function validLogo(value: string | null) {
  return !value || value.startsWith("/") || (/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(value) && value.length <= 700000);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });
  if (user.role === "admin") return Response.json(await getDb().select().from(clients).orderBy(asc(clients.name)));
  const rows = await getDb().select({ id: clients.id, name: clients.name, document: clients.document, logoUrl: clients.logoUrl, primaryColor: clients.primaryColor, secondaryColor: clients.secondaryColor, accentColor: clients.accentColor, active: clients.active, createdAt: clients.createdAt, updatedAt: clients.updatedAt }).from(userClients).innerJoin(clients, eq(userClients.clientId, clients.id)).where(eq(userClients.userId, user.id)).orderBy(asc(clients.name));
  return Response.json(rows.filter(row => row.active));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Cadastro exclusivo do administrador." }, { status: 403 });
  const body = await req.json() as Record<string, unknown>;
  const name = String(body.name || "").trim(), document = String(body.document || "").trim() || null, logoUrl = String(body.logoDataUrl || body.logoUrl || "").trim() || null;
  const primaryColor = String(body.primaryColor || "#302d91"), secondaryColor = String(body.secondaryColor || "#d63a1f"), accentColor = String(body.accentColor || "#ffffff");
  if (!name) return Response.json({ error: "Informe o nome do cliente." }, { status: 400 });
  if (![primaryColor, secondaryColor, accentColor].every(color => colorPattern.test(color)) || !validLogo(logoUrl)) return Response.json({ error: "Logo ou paleta de cores inválida." }, { status: 400 });
  const now = new Date().toISOString();
  const [row] = await getDb().insert(clients).values({ name, document, logoUrl, primaryColor, secondaryColor, accentColor, active: true, createdAt: now, updatedAt: now }).returning();
  await getDb().insert(userClients).values({ userId: user.id, clientId: row.id, createdAt: now });
  await getDb().insert(audits).values({ action: "INCLUSÃO", entity: "CLIENTE", entityId: row.id, details: JSON.stringify({ name, document, primaryColor, secondaryColor, accentColor }), userEmail: user.email, clientId: row.id, createdAt: now });
  return Response.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Edição exclusiva do administrador." }, { status: 403 });
  const body = await req.json() as Record<string, unknown>, id = Number(body.id);
  const [current] = await getDb().select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!current) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
  const name = String(body.name ?? current.name).trim(), document = String(body.document ?? current.document ?? "").trim() || null, logoUrl = String(body.logoDataUrl ?? body.logoUrl ?? current.logoUrl ?? "").trim() || null;
  const primaryColor = String(body.primaryColor ?? current.primaryColor), secondaryColor = String(body.secondaryColor ?? current.secondaryColor), accentColor = String(body.accentColor ?? current.accentColor);
  if (!name || ![primaryColor, secondaryColor, accentColor].every(color => colorPattern.test(color)) || !validLogo(logoUrl)) return Response.json({ error: "Dados do cliente inválidos." }, { status: 400 });
  const active = body.active === undefined ? current.active : Boolean(body.active), updatedAt = new Date().toISOString();
  await getDb().update(clients).set({ name, document, logoUrl, primaryColor, secondaryColor, accentColor, active, updatedAt }).where(eq(clients.id, id));
  await getDb().insert(audits).values({ action: "ALTERAÇÃO", entity: "CLIENTE", entityId: id, details: JSON.stringify({ name, document, primaryColor, secondaryColor, accentColor, active }), userEmail: user.email, clientId: id, createdAt: updatedAt });
  return Response.json({ ok: true });
}
