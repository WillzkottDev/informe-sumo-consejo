import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { councilNotes, organizationReports, presidencyMessages, reports, wards } from "@/db/schema";
import { PortalError, requireAdmin, requirePortalMember } from "@/lib/portal-access";
import { councilFields, messageTopics, TEXT_LIMIT, type CouncilField, type MessageTopic } from "@/lib/stake-council";

export const dynamic = "force-dynamic";

function reply(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

function failure(error: unknown) {
  if (error instanceof PortalError) return reply({ error: error.message }, error.status);
  return reply({ error: "No se pudo acceder a la sección de presidencia. Intenta nuevamente." }, 500);
}

function monthOf(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)) {
    throw new PortalError("Selecciona un mes válido.");
  }
  return value;
}

function recordId(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new PortalError("El registro seleccionado no es válido.");
  }
  return value;
}

function nonemptyText(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > TEXT_LIMIT) {
    throw new PortalError("Escribe un texto de hasta 5.000 caracteres.");
  }
  return value.trim();
}

export async function GET(request: Request) {
  try {
    const member = await requirePortalMember();
    const query = new URL(request.url).searchParams;
    const db = getDb();
    const view = query.get("view");
    if (view === "notes") requireAdmin(member);
    const month = monthOf(query.get("month"));
    if (view === "notes") {
      const rows = await db.select({
        id: councilNotes.id, sourceType: councilNotes.sourceType, sourceId: councilNotes.sourceId,
        sourceField: councilNotes.sourceField, scope: councilNotes.scope, authorName: councilNotes.authorName,
        wardName: councilNotes.wardName, sourceLabel: councilNotes.sourceLabel, monthStart: councilNotes.monthStart,
        excerpt: councilNotes.excerpt,
      }).from(councilNotes).where(eq(councilNotes.monthStart, month)).orderBy(desc(councilNotes.id));
      return reply({ rows });
    }
    if (view !== "messages") throw new PortalError("Sección no disponible.", 404);
    const messages = presidencyMessages;
    const rows = await db.select({
      id: messages.id, authorName: messages.authorName, scope: messages.scope,
      topic: messages.topic, body: messages.body, createdAt: messages.createdAt,
    }).from(messages).where(and(
      eq(messages.monthStart, month),
      member.role === "admin" ? undefined : eq(messages.authorId, member.id),
    )).orderBy(desc(messages.id));
    return reply({ rows });
  } catch (error) { return failure(error); }
}

async function findSource(type: unknown, id: number, field: unknown) {
  const db = getDb();
  if (type === "message" && field === "body") {
    const [row] = await db.select().from(presidencyMessages).where(eq(presidencyMessages.id, id)).limit(1);
    if (row) return { type, field, body: row.body, scope: row.scope, authorName: row.authorName,
      wardName: "", monthStart: row.monthStart, sourceLabel: `Mensaje directo · ${messageTopics[row.topic]}` } as const;
  } else if (type === "organization" && field === "observation") {
    const [row] = await db.select({ report: organizationReports, wardName: wards.name })
      .from(organizationReports).innerJoin(wards, eq(wards.id, organizationReports.wardId))
      .where(eq(organizationReports.id, id)).limit(1);
    if (row) return { type, field, body: row.report.observation, scope: row.report.organization,
      authorName: row.report.reporterName, wardName: row.wardName, monthStart: row.report.monthStart,
      sourceLabel: "Informe de organización" } as const;
  } else if (type === "high_council" && typeof field === "string" && Object.hasOwn(councilFields, field)) {
    const key = field as CouncilField;
    const [row] = await db.select({ report: reports, wardName: wards.name })
      .from(reports).innerJoin(wards, eq(wards.id, reports.wardId))
      .where(and(eq(reports.id, id), eq(reports.status, "submitted"))).limit(1);
    if (row) return { type, field: key, body: row.report[key], scope: "high_council",
      authorName: row.report.reporterName, wardName: row.wardName, monthStart: row.report.weekStart,
      sourceLabel: councilFields[key] } as const;
  } else {
    throw new PortalError("El origen de la nota no es válido.");
  }
  throw new PortalError("El comentario ya no está disponible para destacar.", 404);
}

export async function POST(request: Request) {
  try {
    const member = await requirePortalMember();
    const input: unknown = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new PortalError("Solicitud no válida.");
    const payload = input as Record<string, unknown>;
    const db = getDb();
    if (payload.action === "send") {
      if (member.role !== "leader") throw new PortalError("Solo los perfiles informantes pueden enviar mensajes.", 403);
      const monthStart = monthOf(payload.monthStart);
      const body = nonemptyText(payload.body);
      if (typeof payload.topic !== "string" || !Object.hasOwn(messageTopics, payload.topic)) throw new PortalError("Selecciona el tipo de mensaje.");
      const topic = payload.topic as MessageTopic;
      const requestKey = payload.requestKey;
      if (typeof requestKey !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestKey)) {
        throw new PortalError("Vuelve a intentar el envío.");
      }
      const [inserted] = await db.insert(presidencyMessages).values({
        authorId: member.id, requestKey, authorName: member.displayName, scope: member.reportScope,
        monthStart, topic, body, createdAt: new Date().toISOString(),
      }).onConflictDoNothing({ target: [presidencyMessages.authorId, presidencyMessages.requestKey] })
        .returning({ id: presidencyMessages.id });
      if (inserted) return reply({ ok: true }, 201);
      const [previous] = await db.select().from(presidencyMessages).where(and(
        eq(presidencyMessages.authorId, member.id), eq(presidencyMessages.requestKey, requestKey),
      )).limit(1);
      if (!previous || previous.body !== body || previous.monthStart !== monthStart || previous.topic !== topic) {
        throw new PortalError("El envío anterior ya se registró con otro contenido.", 409);
      }
      return reply({ ok: true });
    }

    requireAdmin(member);
    if (payload.action === "highlight") {
      const id = recordId(payload.sourceId);
      const source = await findSource(payload.sourceType, id, payload.sourceField);
      const excerpt = nonemptyText(payload.excerpt).replace(/\r\n?/g, "\n");
      if (!source.body.replace(/\r\n?/g, "\n").includes(excerpt)) throw new PortalError("El comentario cambió. Vuelve a abrirlo y selecciona una frase del texto guardado.", 409);
      const [created] = await db.insert(councilNotes).values({
        sourceType: source.type, sourceId: id, sourceField: source.field, excerpt,
        scope: source.scope, authorName: source.authorName, wardName: source.wardName,
        sourceLabel: source.sourceLabel, monthStart: source.monthStart, createdBy: member.id,
        createdAt: new Date().toISOString(),
      }).onConflictDoNothing().returning({ id: councilNotes.id });
      return reply({ created: Boolean(created) }, created ? 201 : 200);
    }
    if (payload.action === "remove_note") {
      await db.delete(councilNotes).where(eq(councilNotes.id, recordId(payload.id)));
      return reply({ ok: true });
    }
    throw new PortalError("Acción no disponible.", 404);
  } catch (error) { return failure(error); }
}
