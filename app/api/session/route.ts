import { getCurrentUser } from "../../auth";
import { getD1 } from "../../d1";

export async function GET() {
  const db = getD1();
  const count = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  if (Number(count?.total ?? 0) === 0) {
    return Response.json({ authenticated: false, authorized: false, setup: true }, { status: 401 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ authenticated: false, authorized: false, setup: false }, { status: 401 });
  return Response.json({ authenticated: true, authorized: true, user });
}
