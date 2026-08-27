import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { clients, userClients } from "../db/schema";
import { getCurrentUser } from "./auth";

export async function requireClient(req: Request) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Acesso negado" }, { status: 403 }) };
  const clientId = Number(req.headers.get("x-client-id"));
  if (!Number.isInteger(clientId) || clientId <= 0) return { error: Response.json({ error: "Selecione um cliente." }, { status: 400 }) };
  const [client] = await getDb().select().from(clients).where(and(eq(clients.id, clientId), eq(clients.active, true))).limit(1);
  if (!client) return { error: Response.json({ error: "Cliente não encontrado ou inativo." }, { status: 404 }) };
  if (user.role !== "admin") {
    const [membership] = await getDb().select().from(userClients).where(and(eq(userClients.userId, user.id), eq(userClients.clientId, clientId))).limit(1);
    if (!membership) return { error: Response.json({ error: "Você não possui acesso a este cliente." }, { status: 403 }) };
  }
  return { user, clientId, client };
}
