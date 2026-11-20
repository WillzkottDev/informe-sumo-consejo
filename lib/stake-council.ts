export const organizationLabels = {
  high_council: "Sumo Consejo",
  primary: "Primaria",
  relief_society: "Sociedad de Socorro",
  young_women: "Mujeres Jóvenes",
  young_men: "Hombres Jóvenes",
  jas: "Jóvenes Adultos Solteros (JAS)",
  single_adults: "Adultos Solteros (AS)",
  temple_family_history: "Templo e Historia Familiar",
  missionary_work: "Obra Misional",
  self_reliance: "Autosuficiencia",
  seminary: "Seminario",
  sunday_school: "Escuela Dominical",
} as const;

export type ReportScope = keyof typeof organizationLabels;
export type OrganizationScope = Exclude<ReportScope, "high_council">;

export const messageTopics = {
  comment: "Comentario",
  focus: "Enfoque",
  request: "Solicitud de apoyo",
} as const;
export type MessageTopic = keyof typeof messageTopics;

export const councilFields = {
  sacramentalObservation: "Reunión Sacramental",
  wardCouncilObservation: "Consejo de Barrio",
  missionaryObservation: "Obra Misional y Templo",
  otherObservation: "Otros enfoques",
  punctualityNote: "Puntualidad",
  followupNote: "Seguimiento de asignaciones",
  scheduleNote: "Horario dominical",
} as const;
export type CouncilField = keyof typeof councilFields;
export const councilFieldKeys = Object.keys(councilFields) as CouncilField[];

export type NoteSource =
  | { type: "message"; id: number; field: "body" }
  | { type: "organization"; id: number; field: "observation" }
  | { type: "high_council"; id: number; field: CouncilField };

export function scopeLabel(scope: string) {
  return Object.hasOwn(organizationLabels, scope)
    ? organizationLabels[scope as ReportScope]
    : scope;
}

export const TEXT_LIMIT = 5000;

export type PresidencyMessage = {
  id: number;
  authorName: string;
  scope: string;
  topic: MessageTopic;
  body: string;
  createdAt: string;
};

export type CouncilNote = {
  id: number;
  sourceType: NoteSource["type"];
  sourceId: number;
  sourceField: string;
  scope: string;
  authorName: string;
  wardName: string;
  sourceLabel: string;
  excerpt: string;
  monthStart: string;
};
