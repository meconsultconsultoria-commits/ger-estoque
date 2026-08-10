import { createSession, hashPassword } from "../../../auth";
import { getD1 } from "../../../d1";

export async function POST(request: Request) {
  const db = getD1();
  const count = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if (Number(count?.total ?? 0) > 0) return Response.json({ error: "O administrador inicial já foi criado." }, { status: 409 });
  const body = await request.json().catch(() => ({})) as { name?: string; email?: string; password?: string; confirmPassword?: string };
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  if (name.length < 2) return Response.json({ error: "Informe o nome do administrador." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (password.length < 8 || password !== confirmPassword) return Response.json({ error: "As senhas devem ser iguais e ter ao menos 8 caracteres." }, { status: 400 });
  const result = await db.prepare(
    "INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES (?, ?, ?, 'admin', 1, ?)",
  ).bind(name, email, await hashPassword(password), new Date().toISOString()).run();
  await createSession(Number(result.meta.last_row_id));
  return Response.json({ ok: true }, { status: 201 });
}
