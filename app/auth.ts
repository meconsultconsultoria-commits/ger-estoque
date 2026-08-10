import { cookies } from "next/headers";
import { getD1 } from "./d1";

const SESSION_COOKIE = "ger_session";
const PASSWORD_ITERATIONS = 100_000;
const encoder = new TextEncoder();

export type GerUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "operator";
  active: number;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterationsText, saltText, expectedText] = stored.split("$");
  if (algorithm !== "pbkdf2" || !iterationsText || !saltText || !expectedText) return false;
  const iterations = Number(iterationsText);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: base64ToBytes(saltText), iterations, hash: "SHA-256" },
    key,
    256,
  );
  const actual = new Uint8Array(bits);
  const expected = base64ToBytes(expectedText);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) mismatch |= actual[i] ^ expected[i];
  return mismatch === 0;
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToBase64(new Uint8Array(digest));
}

export async function createSession(userId: number) {
  const db = getD1();
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64(tokenBytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, userId, expiresAt.toISOString())
    .run();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const db = getD1();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(token)).run();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<GerUser | null> {
  const db = getD1();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
    LIMIT 1
  `).bind(await hashToken(token), new Date().toISOString()).first<GerUser>();
  return user ?? null;
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
