import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { councilCommentPublications as publications, members, memberWards, organizationReports, reports, wards } from "@/db/schema";
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

import { councilFieldKeys, councilFields, type CouncilField } from "@/lib/stake-council";

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

function validateMonth(value: unknown) {
  const month = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-01$/.test(month)) {
    throw new PortalError("El mes seleccionado no es válido.");
  }
  const parsed = new Date(`${month}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new PortalError("El mes seleccionado no es válido.");
  }
  return month;
}

export async function GET() {
  try {
    const member = await requirePortalMember();
    const db = getDb();

    const isAdmin = member.role === "admin";
    const isCouncillor = !isAdmin && member.reportScope === "high_council";
    const assignmentsForMember = db.select({ wardId: memberWards.wardId }).from(memberWards)
      .where(eq(memberWards.memberId, member.id));
    const wardScope = and(eq(wards.active, true), isCouncillor ? inArray(wards.id, assignmentsForMember) : undefined);
    const visibleWards = await db.select().from(wards).where(wardScope).orderBy(asc(wards.name));
    const assignedWardIds = isAdmin || isCouncillor
      ? visibleWards.map((ward) => ward.id)
      : (await assignmentsForMember).map((row) => row.wardId);

    const reportRows = isAdmin || isCouncillor
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
          .where(and(wardScope, isAdmin ? undefined : eq(reports.reporterMemberId, member.id)))
          .orderBy(desc(reports.weekStart), asc(wards.name))
      : [];
    const organizationRows = await db
          .select({
            id: organizationReports.id,
            wardId: organizationReports.wardId,
            wardName: wards.name,
            monthStart: organizationReports.monthStart,
            organization: organizationReports.organization,
            observation: organizationReports.observation,
            approvalStatus: organizationReports.approvalStatus,
            approvedAt: organizationReports.approvedAt,
            reporterMemberId: organizationReports.reporterMemberId,
            reporterName: organizationReports.reporterName,
            updatedAt: organizationReports.updatedAt,
          })
          .from(organizationReports)
          .innerJoin(wards, eq(organizationReports.wardId, wards.id))
          .where(and(wardScope, isAdmin ? undefined : or(
            eq(organizationReports.approvalStatus, "approved"),
            isCouncillor ? undefined : and(
              eq(organizationReports.organization, member.reportScope),
              eq(organizationReports.reporterMemberId, member.id),
            ),
          )))
          .orderBy(desc(organizationReports.monthStart), asc(wards.name));

    const publishedCouncilComments = await db.select({
      reportId: publications.reportId, field: publications.field, text: publications.approvedText,
      wardId: reports.wardId, wardName: wards.name, monthStart: reports.weekStart,
      reporterName: reports.reporterName, approvedAt: publications.approvedAt,
    }).from(publications)
      .innerJoin(reports, eq(publications.reportId, reports.id))
      .innerJoin(wards, eq(reports.wardId, wards.id))
      .where(and(wardScope, or(...councilFieldKeys.map((field) =>
        and(eq(publications.field, field), eq(publications.approvedText, reports[field])),
      ))))
      .orderBy(desc(reports.weekStart), asc(wards.name), asc(publications.field));

    // One form per ward and month. Other authors only receive its occupied slot.
    const occupiedSlots = isAdmin ? [] : isCouncillor
      ? await db.select({ wardId: reports.wardId, monthStart: reports.weekStart }).from(reports)
          .innerJoin(wards, eq(reports.wardId, wards.id))
          .where(and(wardScope, or(ne(reports.reporterMemberId, member.id), isNull(reports.reporterMemberId))))
      : await db.select({ wardId: organizationReports.wardId, monthStart: organizationReports.monthStart })
          .from(organizationReports).innerJoin(wards, eq(organizationReports.wardId, wards.id))
          .where(and(wardScope, eq(organizationReports.organization, member.reportScope),
            ne(organizationReports.approvalStatus, "approved"),
            or(ne(organizationReports.reporterMemberId, member.id), isNull(organizationReports.reporterMemberId))));

    const memberRows =
      member.role === "admin"
        ? await db
            .select({
              id: members.id,
              email: members.email,
              username: members.username,
              displayName: members.displayName,
              role: members.role,
              reportScope: members.reportScope,
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
        reportScope: member.reportScope,
        username: member.username,
      },
      wards: visibleWards,
      reports: reportRows,
      publishedCouncilComments,
      occupiedSlots,
      organizationReports: organizationRows,
      members: memberRows.map((row) => ({ ...row, connected: Boolean(row.connected) })),
      assignments: assignmentRows,
      currentAssignmentWardIds: assignedWardIds,
    }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
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
      if (member.role === "admin" || member.reportScope !== "high_council") {
        throw new PortalError("Solo los integrantes del Sumo Consejo asignados pueden enviar este informe.", 403);
      }
      const wardId = numericId(payload.wardId, "El barrio");
      if (!(await canAccessWard(member, wardId))) {
        throw new PortalError("No tienes acceso a este barrio.", 403);
      }
      const weekStart = validateMonth(payload.weekStart);
      const status = payload.status === "submitted" ? "submitted" : "draft";
      const punctualityState = cleanText(payload.punctualityState, 30);
      const followupState = cleanText(payload.followupState, 30);
      const scheduleState = cleanText(payload.scheduleState, 30);

      if (status === "submitted") {
        if (
          !VALID_STATES.has(punctualityState) ||
          !VALID_STATES.has(followupState) ||
          !VALID_STATES.has(scheduleState)
        ) {
          throw new PortalError("Completa los tres puntos de atención obligatorios.");
        }
      }

      const now = new Date().toISOString();
      const values = {
        wardId,
        weekStart,
        status,
        sacramentalObservation: cleanText(payload.sacramentalObservation),
        punctualityState,
        wardCouncilObservation: cleanText(payload.wardCouncilObservation),
        followupState,
        missionaryObservation: cleanText(payload.missionaryObservation),
        otherObservation: cleanText(payload.otherObservation),
        scheduleState,
        reporterMemberId: member.id,
        reporterName: member.displayName,
        submittedAt: status === "submitted" ? now : null,
        updatedAt: now,
      };

      const editableFields = ["sacramentalObservation", "wardCouncilObservation", "missionaryObservation", "otherObservation"] as const;
      const [[saved]] = await db.batch([
        db.insert(reports).values(values).onConflictDoUpdate({
          target: [reports.wardId, reports.weekStart],
          set: values,
          setWhere: eq(reports.reporterMemberId, member.id),
        }).returning(),
        // Withdraw only changed comments, atomically with the author's save.
        db.delete(publications).where(and(
          inArray(publications.reportId, db.select({ id: reports.id }).from(reports).where(and(
            eq(reports.wardId, wardId), eq(reports.weekStart, weekStart), eq(reports.reporterMemberId, member.id),
          ))),
          or(...editableFields.map((field) => and(eq(publications.field, field), ne(publications.approvedText, values[field])))),
        )),
      ]);
      if (!saved) throw new PortalError("Otro informante ya registró el informe de este barrio y mes.", 409);
      return Response.json({ report: saved });
    }

    if (action === "save_organization_report") {
      const wardId = numericId(payload.wardId, "El barrio");
      const monthStart = validateMonth(payload.monthStart);
      const validOrganizations = new Set(["primary", "relief_society", "young_women", "young_men", "jas", "single_adults", "temple_family_history", "missionary_work", "self_reliance", "seminary", "sunday_school"]);
      const requestedOrganization = cleanText(payload.organization, 30);
      const organization = member.role === "admin" ? requestedOrganization : member.reportScope;
      if (!validOrganizations.has(organization)) throw new PortalError("La organización no es válida.");
      const [ward] = await db.select({ id: wards.id }).from(wards).where(and(eq(wards.id, wardId), eq(wards.active, true)));
      if (!ward) throw new PortalError("El barrio ya no está disponible.", 404);
      const now = new Date().toISOString();
      const values = {
        wardId,
        monthStart,
        organization,
        observation: cleanText(payload.observation),
        reporterMemberId: member.id,
        reporterName: member.displayName,
        approvalStatus: "pending",
        approvedAt: null,
        approvedByMemberId: null,
        updatedAt: now,
      };
      const [saved] = await db.insert(organizationReports).values(values).onConflictDoUpdate({
        target: [organizationReports.wardId, organizationReports.monthStart, organizationReports.organization],
        set: {
          ...values,
          approvalStatus: sql`CASE WHEN ${organizationReports.observation} = ${values.observation} THEN ${organizationReports.approvalStatus} ELSE 'pending' END`,
          approvedAt: sql`CASE WHEN ${organizationReports.observation} = ${values.observation} THEN ${organizationReports.approvedAt} END`,
          approvedByMemberId: sql`CASE WHEN ${organizationReports.observation} = ${values.observation} THEN ${organizationReports.approvedByMemberId} END`,
        },
        setWhere: member.role === "admin" ? undefined : or(
          eq(organizationReports.reporterMemberId, member.id), eq(organizationReports.approvalStatus, "approved"),
        ),
      }).returning();
      if (!saved) throw new PortalError("Otro informante de tu organización tiene un aporte pendiente en este barrio y mes.", 409);
      return Response.json({ organizationReport: saved });
    }

    if (action === "review_organization_report") {
      requireAdmin(member);
      const reportId = numericId(payload.reportId, "El informe");
      const approvalStatus = payload.approvalStatus === "approved" ? "approved" : "pending";
      const observation = cleanText(payload.observation);
      if (approvalStatus === "approved" && !observation) throw new PortalError("Escribe un comentario para publicarlo.");
      const now = new Date().toISOString();
      const [saved] = await db.update(organizationReports).set({
        observation,
        approvalStatus,
        approvedAt: approvalStatus === "approved" ? now : null,
        approvedByMemberId: approvalStatus === "approved" ? member.id : null,
        updatedAt: now,
      }).where(and(eq(organizationReports.id, reportId),
        typeof payload.previousObservation === "string" ? eq(organizationReports.observation, payload.previousObservation) : undefined,
        typeof payload.previousStatus === "string" ? eq(organizationReports.approvalStatus, payload.previousStatus) : undefined,
      )).returning();
      if (!saved) throw new PortalError("El aporte cambió o se eliminó. Vuelve a revisar la versión actual.", 409);
      return Response.json({ organizationReport: saved });
    }

    if (action === "review_council_comment") {
      requireAdmin(member);
      const reportId = numericId(payload.reportId, "El informe");
      if (typeof payload.field !== "string" || !Object.hasOwn(councilFields, payload.field)) {
        throw new PortalError("La sección del comentario no es válida.");
      }
      const field = payload.field as CouncilField;
      const text = payload.text;
      if (typeof text !== "string" || !text.trim()) throw new PortalError("El comentario está vacío.");
      if (payload.decision === "withdraw") {
        const withdrawn = await db.delete(publications).where(and(
          eq(publications.reportId, reportId), eq(publications.field, field), eq(publications.approvedText, text),
        )).returning({ reportId: publications.reportId });
        if (!withdrawn.length) throw new PortalError("La publicación cambió. Revisa la versión actual.", 409);
      } else if (payload.decision === "publish") {
        const published = await db.all(sql`
          INSERT INTO ${publications} (report_id, field, approved_text, approved_at, approved_by)
          SELECT ${reports.id}, ${field}, ${reports[field]}, ${new Date().toISOString()}, ${member.id}
          FROM ${reports}
          WHERE ${reports.id} = ${reportId} AND ${reports.status} = 'submitted' AND ${reports[field]} = ${text}
          ON CONFLICT (report_id, field) DO UPDATE SET approved_text = excluded.approved_text,
            approved_at = excluded.approved_at, approved_by = excluded.approved_by
          RETURNING report_id
        `);
        if (!published.length) throw new PortalError("El informe cambió. Revisa el comentario enviado antes de publicarlo.", 409);
      } else {
        throw new PortalError("La decisión de publicación no es válida.");
      }
      return Response.json({ ok: true });
    }

    if (action === "delete_report") {
      requireAdmin(member);
      const reportId = numericId(payload.reportId, "El informe");
      const reportType = payload.reportType === "organization" ? "organization" : "high_council";
      const deleted = reportType === "organization"
        ? await db.delete(organizationReports).where(eq(organizationReports.id, reportId)).returning({ id: organizationReports.id })
        : await db.delete(reports).where(eq(reports.id, reportId)).returning({ id: reports.id });
      if (!deleted.length) throw new PortalError("El informe ya no existe.", 404);
      return Response.json({ ok: true });
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

    if (action === "delete_ward") {
      requireAdmin(member);
      const wardId = numericId(payload.wardId, "El barrio");
      const [existing] = await db.select({ id: wards.id }).from(wards).where(eq(wards.id, wardId)).limit(1);
      if (!existing) throw new PortalError("El barrio ya no existe.", 404);
      await db.delete(memberWards).where(eq(memberWards.wardId, wardId));
      await db.delete(organizationReports).where(eq(organizationReports.wardId, wardId));
      await db.delete(reports).where(eq(reports.wardId, wardId));
      await db.delete(wards).where(eq(wards.id, wardId));
      return Response.json({ ok: true });
    }

    if (action === "save_member") {
      requireAdmin(member);
      const memberId = payload.memberId ? numericId(payload.memberId, "El usuario") : null;
      const email = cleanText(payload.email, 180).toLowerCase();
      const username = cleanText(payload.username, 60).toLowerCase();
      const password = typeof payload.password === "string" ? payload.password : "";
      const displayName = cleanText(payload.displayName, 100);
      const role = payload.role === "admin" ? "admin" : "leader";
      const validScopes = new Set(["high_council", "primary", "relief_society", "young_women", "young_men", "jas", "single_adults", "temple_family_history", "missionary_work", "self_reliance", "seminary", "sunday_school"]);
      const requestedScope = cleanText(payload.reportScope, 30);
      const reportScope = role === "admin" ? "high_council" : validScopes.has(requestedScope) ? requestedScope : "high_council";
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
            email, username, displayName, role, reportScope, active, updatedAt: new Date().toISOString(),
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
          .values({ email, username, passwordHash: credentials.hash, passwordSalt: credentials.salt, displayName, role, reportScope, active })
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
