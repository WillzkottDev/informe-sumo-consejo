import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { members, memberWards, reports, wards } from "@/db/schema";
import {
  canAccessWard,
  hashPassword,
  loginWithCredentials,
  logoutCurrentSession,
  PortalError,
  portalErrorResponse,
  requireAdmin,
  requirePortalMember,
  SESSION_COOKIE,
} from "@/lib/portal-access";

export const dynamic = "force-dynamic";

const VALID_STATES = new Set(["sin_novedad", "destacable", "requiere_atencion"]);

function cleanText(value: unknown, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numericId(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PortalError(`${label} no es válido.`);
  }
  return parsed;
}

function validateWeek(value: unknown) {
  const week = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    throw new PortalError("La semana seleccionada no es válida.");
  }
  const parsed = new Date(`${week}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    throw new PortalError("La semana debe comenzar un lunes.");
  }
  return week;
}

export async function GET() {
  try {
    const member = await requirePortalMember();
    const db = getDb();

    const visibleWards =
      member.role === "admin"
        ? await db.select().from(wards).where(eq(wards.active, true)).orderBy(asc(wards.name))
        : await db
            .select({
              id: wards.id,
              name: wards.name,
              active: wards.active,
              createdAt: wards.createdAt,
            })
            .from(memberWards)
            .innerJoin(wards, eq(memberWards.wardId, wards.id))
            .where(eq(memberWards.memberId, member.id))
            .orderBy(asc(wards.name));

    const wardIds = visibleWards.map((ward) => ward.id);
    const reportRows = wardIds.length
      ? await db
          .select({
            id: reports.id,
            wardId: reports.wardId,
            wardName: wards.name,
            weekStart: reports.weekStart,
            status: reports.status,
            sacramentalObservation: reports.sacramentalObservation,
            punctualityState: reports.punctualityState,
            punctualityNote: reports.punctualityNote,
            wardCouncilObservation: reports.wardCouncilObservation,
            followupState: reports.followupState,
            followupNote: reports.followupNote,
            missionaryObservation: reports.missionaryObservation,
            otherObservation: reports.otherObservation,
            scheduleState: reports.scheduleState,
            scheduleNote: reports.scheduleNote,
            reporterName: reports.reporterName,
            submittedAt: reports.submittedAt,
            updatedAt: reports.updatedAt,
          })
          .from(reports)
          .innerJoin(wards, eq(reports.wardId, wards.id))
          .where(inArray(reports.wardId, wardIds))
          .orderBy(desc(reports.weekStart), asc(wards.name))
          .limit(600)
      : [];

    const memberRows =
      member.role === "admin"
        ? await db
            .select({
              id: members.id,
              email: members.email,
              username: members.username,
              displayName: members.displayName,
              role: members.role,
              active: members.active,
              connected: members.authUserId,
            })
            .from(members)
            .orderBy(asc(members.displayName))
        : [];
    const assignmentRows =
      member.role === "admin" ? await db.select().from(memberWards) : [];

    return Response.json({
      currentMember: {
        id: member.id,
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        username: member.username,
      },
      wards: visibleWards,
      reports: reportRows,
      members: memberRows.map((row) => ({ ...row, connected: Boolean(row.connected) })),
      assignments: assignmentRows,
    });
  } catch (error) {
    return portalErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const payload = (await request.json()) as Record<string, unknown>;
    const action = cleanText(payload.action, 40);

    if (action === "login") {
      const username = cleanText(payload.username, 60);
      const password = typeof payload.password === "string" ? payload.password : "";
      const { rawToken, member: loggedMember } = await loginWithCredentials(username, password);
      return new Response(JSON.stringify({
        currentMember: {
          id: loggedMember.id,
          email: loggedMember.email,
          displayName: loggedMember.displayName,
          role: loggedMember.role,
          username: loggedMember.username,
        },
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `${SESSION_COOKIE}=${rawToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      });
    }

    const member = await requirePortalMember();

    if (action === "logout") {
      await logoutCurrentSession();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        },
      });
    }

    if (action === "save_report") {
      const wardId = numericId(payload.wardId, "El barrio");
      if (!(await canAccessWard(member, wardId))) {
        throw new PortalError("No tienes acceso a este barrio.", 403);
      }
      const weekStart = validateWeek(payload.weekStart);
      const status = payload.status === "submitted" ? "submitted" : "draft";
      const punctualityState = cleanText(payload.punctualityState, 30);
      const followupState = cleanText(payload.followupState, 30);
      const scheduleState = cleanText(payload.scheduleState, 30);
      const punctualityNote = cleanText(payload.punctualityNote);
      const followupNote = cleanText(payload.followupNote);
      const scheduleNote = cleanText(payload.scheduleNote);

      if (status === "submitted") {
        if (
          !VALID_STATES.has(punctualityState) ||
          !VALID_STATES.has(followupState) ||
          !VALID_STATES.has(scheduleState)
        ) {
          throw new PortalError("Completa los tres puntos de atención obligatorios.");
        }
        if (
          (punctualityState === "requiere_atencion" && !punctualityNote) ||
          (followupState === "requiere_atencion" && !followupNote) ||
          (scheduleState === "requiere_atencion" && !scheduleNote)
        ) {
          throw new PortalError(
            "Agrega un comentario en cada punto marcado como requiere atención.",
          );
        }
      }

      const now = new Date().toISOString();
      const values = {
        wardId,
        weekStart,
        status,
        sacramentalObservation: cleanText(payload.sacramentalObservation),
        punctualityState,
        punctualityNote,
        wardCouncilObservation: cleanText(payload.wardCouncilObservation),
        followupState,
        followupNote,
        missionaryObservation: cleanText(payload.missionaryObservation),
        otherObservation: cleanText(payload.otherObservation),
        scheduleState,
        scheduleNote,
        reporterMemberId: member.id,
        reporterName: member.displayName,
        submittedAt: status === "submitted" ? now : null,
        updatedAt: now,
      };

      const [saved] = await db
        .insert(reports)
        .values(values)
        .onConflictDoUpdate({
          target: [reports.wardId, reports.weekStart],
          set: values,
        })
        .returning();
      return Response.json({ report: saved });
    }

    if (action === "create_ward") {
      requireAdmin(member);
      const name = cleanText(payload.name, 80);
      if (name.length < 2) throw new PortalError("Ingresa el nombre del barrio.");
      const [existing] = await db.select().from(wards).where(eq(wards.name, name)).limit(1);
      if (existing) throw new PortalError("Ese barrio ya está registrado.");
      const [ward] = await db.insert(wards).values({ name }).returning();
      return Response.json({ ward }, { status: 201 });
    }

    if (action === "save_member") {
      requireAdmin(member);
      const memberId = payload.memberId ? numericId(payload.memberId, "El usuario") : null;
      const email = cleanText(payload.email, 180).toLowerCase();
      const username = cleanText(payload.username, 60).toLowerCase();
      const password = typeof payload.password === "string" ? payload.password : "";
      const displayName = cleanText(payload.displayName, 100);
      const role = payload.role === "admin" ? "admin" : "leader";
      const active = payload.active !== false;
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new PortalError("Ingresa un correo válido.");
      }
      if (displayName.length < 2) throw new PortalError("Ingresa el nombre del usuario.");
      if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) throw new PortalError("El usuario debe tener entre 3 y 50 caracteres.");
      if (memberId === member.id && (role !== "admin" || !active)) {
        throw new PortalError("No puedes retirar tu propio acceso de administrador.");
      }

      let savedMember: typeof members.$inferSelect;
      if (memberId) {
        const [existing] = await db
          .select()
          .from(members)
          .where(eq(members.id, memberId))
          .limit(1);
        if (!existing) throw new PortalError("El usuario ya no existe.", 404);
        const duplicate = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
        if (duplicate[0] && duplicate[0].id !== memberId) throw new PortalError("Ya existe un usuario con ese nombre.");
        const credentials = password ? await hashPassword(password) : null;
        const [updated] = await db
          .update(members)
          .set({
            email, username, displayName, role, active, updatedAt: new Date().toISOString(),
            ...(credentials ? { passwordHash: credentials.hash, passwordSalt: credentials.salt } : {}),
          })
          .where(eq(members.id, memberId))
          .returning();
        savedMember = updated;
      } else {
        const [existing] = await db
          .select()
          .from(members)
          .where(eq(members.email, email))
          .limit(1);
        if (existing) throw new PortalError("Ya existe un usuario con ese correo.");
        const [existingUsername] = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
        if (existingUsername) throw new PortalError("Ya existe un usuario con ese nombre.");
        if (password.length < 8) throw new PortalError("La contraseña debe tener al menos 8 caracteres.");
        const credentials = await hashPassword(password);
        const [created] = await db
          .insert(members)
          .values({ email, username, passwordHash: credentials.hash, passwordSalt: credentials.salt, displayName, role, active })
          .returning();
        savedMember = created;
      }

      const wardIds = Array.isArray(payload.wardIds)
        ? [...new Set(payload.wardIds.map((value) => Number(value)).filter(Number.isInteger))]
        : [];
      await db.delete(memberWards).where(eq(memberWards.memberId, savedMember.id));
      if (wardIds.length) {
        const validWards = await db
          .select({ id: wards.id })
          .from(wards)
          .where(inArray(wards.id, wardIds));
        if (validWards.length !== wardIds.length) {
          throw new PortalError("Una de las asignaciones de barrio no es válida.");
        }
        await db.insert(memberWards).values(
          wardIds.map((wardId) => ({ memberId: savedMember.id, wardId })),
        );
      }
      return Response.json({ member: savedMember });
    }

    throw new PortalError("Acción no reconocida.", 404);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
