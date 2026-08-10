import { createSession, verifyPassword } from "../../../auth";
import { getD1 } from "../../../d1";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const user = await getD1().prepare(
    "SELECT id, password_hash AS passwordHash, active FROM users WHERE email = ? LIMIT 1",
  ).bind(email).first<{ id: number; passwordHash: string; active: number }>();
  if (!user || !user.active || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({ ok: true });
}
