"use client";

import { useId, useState } from "react";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { organizationLabels, type ReportScope } from "@/lib/stake-council";

type Topic = { id: string; question: string; steps: string[]; view: string; link: string };

function topicsFor(isAdmin: boolean, scope: ReportScope, assignedWards: string[]): Topic[] {
  if (isAdmin) return [
    { id: "inbox", question: "¿Dónde leo los mensajes dirigidos a la presidencia?", steps: [
      "Abre Mensajes a la presidencia y elige el mes en la cabecera.",
      "En la bandeja verás el perfil, el nombre del informante y su mensaje. Puedes destacar una idea para el consejo desde la misma tarjeta.",
    ], view: "presidency", link: "Abrir bandeja de la presidencia" },
    { id: "highlight", question: "¿Cómo destaco una frase de un informe?", steps: [
      "En Consulta de informes, selecciona el mes y el barrio. También puedes destacar un comentario enviado por un sumo o una organización desde Aprobaciones.",
      "Pulsa Destacar junto al comentario. Selecciona con el cursor la frase que quieres guardar o deja el comentario completo.",
      "Pulsa Guardar nota. La marca queda reservada a Administración y la publicación del informe conserva su texto.",
    ], view: "shared", link: "Ir a consulta de informes" },
    { id: "notes", question: "¿Cómo preparo las notas para el consejo de estaca?", steps: [
      "Abre Notas para consejo de estaca y selecciona el mes de la reunión o del aporte que buscas.",
      "La tabla muestra el origen y la frase guardada. Todos los administradores consultan la misma lista.",
      "Para retirar una idea de la agenda, pulsa Quitar de las notas en su fila. El comentario original se conserva.",
    ], view: "council-notes", link: "Abrir notas para el consejo" },
    { id: "publish", question: "¿Cómo reviso y publico un comentario del Sumo Consejo o de una organización?", steps: [
      "En Aprobaciones elige el mes. Busca el barrio y la sección en Comentarios del Sumo Consejo o en Aportes de organizaciones.",
      "Pulsa Aprobar y publicar en el comentario que revisaste. Lo verán todas las organizaciones y los sumos asignados al barrio. Los demás comentarios del informe se revisan por separado.",
      "Si cambia el texto, revisa la nueva versión. Puedes usar Retirar publicación para quitar un comentario de la consulta. Destacar guarda una nota privada para Administración.",
    ], view: "approvals", link: "Ir a aprobaciones" },
    { id: "overview", question: "¿Qué barrios enviaron su informe del mes?", steps: [
      "En Resumen Estaca, elige el mes y revisa Estado por barrio.",
      "Abre un barrio para consultar el detalle. En Historial también puedes buscar informes de meses anteriores.",
    ], view: "stake", link: "Abrir resumen de estaca" },
    { id: "accounts", question: "¿Cómo ajusto un perfil o sus barrios?", steps: [
      "En Administración, abre la cuenta que quieres actualizar.",
      "Revisa el rol, el perfil de informe y los barrios asignados. Guarda los cambios para aplicarlos.",
    ], view: "admin", link: "Ir a administración" },
  ];
  const isCouncil = scope === "high_council";
  const organization = organizationLabels[scope];
  const wardText = assignedWards.length
    ? `Tus barrios asignados son ${assignedWards.join(", ")}.`
    : "Si aún no aparecen barrios asignados, solicita la asignación a Administración de estaca.";
  return [
    ...(isCouncil ? [{
      id: "report", question: "¿Cómo completo y envío mi informe mensual?", steps: [
        "En Informe mensual, selecciona el mes y el barrio.", wardText,
        "Escribe las observaciones del barrio y marca los tres puntos obligatorios con Sin novedad, Destacable o Requiere atención.",
        "Pulsa Enviar informe para entregarlo a Administración. Cada comentario podrá aparecer en la consulta cuando un administrador lo apruebe y publique.",
      ], view: "report", link: "Abrir mi informe mensual",
    }] : [{
      id: "report", question: `¿Cómo informo por ${organization}?`, steps: [
        "Abre Informe de organización y selecciona el mes. En celular, toca el nombre del barrio para desplegar su tarjeta.",
        "Escribe el comentario y espera la confirmación del guardado automático. Administración podrá revisarlo en Aprobaciones.",
        "Cuando Administración lo publique, aparecerá en Consulta de informes. Si cambias el texto, Administración volverá a revisarlo.",
      ], view: "report", link: "Abrir mi informe de organización",
    }]),
    { id: "message", question: "¿Cómo envío un mensaje directo a la presidencia?", steps: [
      "Abre Mensaje directo a la presidencia. Elige el mes y selecciona Comentario, Enfoque o Solicitud de apoyo.",
      "Escribe el mensaje y pulsa Enviar mensaje. Podrás revisarlo en Mis mensajes enviados.",
      "Este canal llega a Administración de estaca. Los demás informantes no reciben el mensaje.",
    ], view: "presidency", link: "Escribir a la presidencia" },
    { id: "read", question: "¿Qué información puedo consultar?", steps: isCouncil ? [
      wardText, "En Consulta de informes elige el mes, el barrio y, si lo necesitas, el tipo de información.",
      "Verás los comentarios publicados del Sumo Consejo y de todas las organizaciones en esos barrios. Tu propio informe, incluidos los borradores, está en Informe mensual.",
    ] : [
      "En Consulta de informes puedes leer los comentarios publicados del Sumo Consejo y de todas las organizaciones en cualquier barrio de la estaca, incluso si tu cuenta no tiene barrios asignados.",
      "Elige el mes y el barrio. En Tipo de información selecciona Sumo Consejo o la organización que te interesa.",
    ], view: "shared", link: "Consultar informes" },
    { id: "history", question: "¿Dónde encuentro aportes de meses anteriores?", steps: [
      "Abre Historial y selecciona el barrio que necesitas.",
      isCouncil ? "Filtra por Enviados o Borradores y pulsa Abrir en el informe que buscas." : "En Comentarios publicados encontrarás lo que publicó el Sumo Consejo. En Historial de informaciones verás los aportes publicados de las organizaciones y tus propios pendientes.",
    ], view: "history", link: "Abrir historial" },
  ];
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function HelpView({ isAdmin, scope, assignedWards, navigate }: {
  isAdmin: boolean; scope: ReportScope; assignedWards: string[]; navigate: (view: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const prefix = useId();
  const words = normalize(search).trim().split(/\s+/);
  const topics = topicsFor(isAdmin, scope, assignedWards).filter((topic) => {
    const content = normalize([topic.question, ...topic.steps].join(" "));
    return words.every((word) => content.includes(word));
  });
  return <section className="panel private-panel help-guide">
    <div className="panel-heading"><div><h2>{isAdmin ? "Administración de estaca" : organizationLabels[scope]}</h2>
      <p>Busca una tarea o abre una pregunta para ver sus pasos.</p></div></div>
    <label className="help-search"><Search aria-hidden="true" /><Input type="search" value={search}
      onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en mi guía" aria-label="Buscar en mi guía" /></label>
    <div className="help-topics">{topics.map((topic) => {
      const open = expanded === topic.id;
      const questionId = `${prefix}-${topic.id}`;
      return <article key={topic.id} className="help-topic">
        <h3><button id={questionId} aria-expanded={open} aria-controls={`${questionId}-answer`}
          onClick={() => setExpanded(open ? null : topic.id)}>{topic.question}<ChevronDown aria-hidden="true" /></button></h3>
        <div className="help-answer" id={`${questionId}-answer`} role="region" aria-labelledby={questionId} hidden={!open}>
          <ol>{topic.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <Button variant="outline" onClick={() => navigate(topic.view)}>{topic.link}<ArrowRight /></Button>
        </div>
      </article>;
    })}</div>
    {!topics.length && <p role="status" className="mini-empty">No encontramos ese tema. Prueba con «informe», «mensaje» o «barrio».</p>}
  </section>;
}
