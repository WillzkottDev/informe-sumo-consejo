import { and, count, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { members, memberWards, sessions } from "@/db/schema";

export const SESSION_COOKIE = "sc_session";
export const INITIAL_USERNAME = "admin";
export const INITIAL_PASSWORD = "SumoConsejo2026!";

export class PortalError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function derivePassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt = crypto.randomUUID()) {
  return { salt, hash: await derivePassword(password, salt) };
}

export async function loginWithCredentials(username: string, password: string) {
  const db = getDb();
  const normalizedUsername = username.trim().toLowerCase();
  const [candidate] = await db.select().from(members).where(eq(members.username, normalizedUsername)).limit(1);
  let member = candidate;

  // First-run bootstrap: the known initial account is created only when the D1 is empty.
  if (!member && normalizedUsername === INITIAL_USERNAME && password === INITIAL_PASSWORD) {
    const [{ total }] = await db.select({ total: count() }).from(members);
    if (total === 0) {
      const credentials = await hashPassword(password);
      const [created] = await db.insert(members).values({
        email: "admin@sumoconsejo.local",
        username: normalizedUsername,
        passwordHash: credentials.hash,
        passwordSalt: credentials.salt,
        displayName: "Administrador de Estaca",
        role: "admin",
      }).returning();
      member = created;
    }
  }

  if (!member || !member.active || !member.passwordHash || !member.passwordSalt) {
    throw new PortalError("Usuario o contraseña incorrectos.", 401);
  }
  const incomingHash = await derivePassword(password, member.passwordSalt);
  if (incomingHash !== member.passwordHash) throw new PortalError("Usuario o contraseña incorrectos.", 401);
  const rawToken = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
  await db.insert(sessions).values({ memberId: member.id, tokenHash, expiresAt });
  return { rawToken, member };
}

export async function logoutCurrentSession() {
  const jar = await cookies();
  const rawToken = jar.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, await sha256(rawToken)));
  }
}

export async function requirePortalMember() {
  const jar = await cookies();
  const rawToken = jar.get(SESSION_COOKIE)?.value;
  if (!rawToken) throw new PortalError("Inicia sesión para continuar.", 401);
  const db = getDb();
  const [row] = await db.select({ member: members }).from(sessions).innerJoin(members, eq(sessions.memberId, members.id)).where(and(eq(sessions.tokenHash, await sha256(rawToken)), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
  if (!row?.member || !row.member.active) throw new PortalError("Tu sesión expiró. Inicia sesión nuevamente.", 401);
  return row.member;
}

export function requireAdmin(member: typeof members.$inferSelect) {
  if (member.role !== "admin") throw new PortalError("Esta acción requiere permisos de administración.", 403);
}

export async function canAccessWard(member: typeof members.$inferSelect, wardId: number) {
  if (member.role === "admin") return true;
  const db = getDb();
  const [assignment] = await db.select({ memberId: memberWards.memberId }).from(memberWards).where(and(eq(memberWards.memberId, member.id), eq(memberWards.wardId, wardId))).limit(1);
  return Boolean(assignment);
}

export function portalErrorResponse(error: unknown) {
  if (error instanceof PortalError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Error inesperado";
  console.error("Portal error:", error);
  const unavailable = message.includes("no such table") || message.includes("D1 binding");
  return Response.json({ error: unavailable ? "El portal se está preparando. Intenta nuevamente en unos instantes." : `No fue posible completar la solicitud: ${message}` }, { status: 500 });
}

