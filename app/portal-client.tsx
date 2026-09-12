"use client";

import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileClock,
  FilePenLine,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type Ward = { id: number; name: string; active: boolean; createdAt: string };
type OrganizationScope = "primary" | "relief_society" | "young_women" | "young_men" | "jas" | "single_adults" | "temple_family_history" | "missionary_work" | "self_reliance" | "seminary" | "sunday_school";
type ReportScope = "high_council" | OrganizationScope;
type Member = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: "admin" | "leader";
  reportScope: ReportScope;
  active: boolean;
  connected: boolean;
};
type OrganizationReport = {
  id: number;
  wardId: number;
  wardName: string;
  monthStart: string;
  organization: OrganizationScope;
  observation: string;
  approvalStatus: "pending" | "approved";
  approvedAt: string | null;
  reporterMemberId: number | null;
  reporterName: string;
  updatedAt: string;
};
type Assignment = { memberId: number; wardId: number };
type ReportState = "" | "sin_novedad" | "destacable" | "requiere_atencion";
type Report = {
  id: number;
  wardId: number;
  wardName: string;
  weekStart: string;
  status: "draft" | "submitted";
  sacramentalObservation: string;
  punctualityState: ReportState;
  punctualityNote: string;
  wardCouncilObservation: string;
  followupState: ReportState;
  followupNote: string;
  missionaryObservation: string;
  otherObservation: string;
  scheduleState: ReportState;
  scheduleNote: string;
  reporterName: string;
  submittedAt: string | null;
  updatedAt: string;
};
type PortalData = {
  currentMember: {
    id: number;
    email: string;
    username: string;
    displayName: string;
    role: "admin" | "leader";
    reportScope: ReportScope;
  };
  wards: Ward[];
  reports: Report[];
  organizationReports: OrganizationReport[];
  members: Member[];
  assignments: Assignment[];
  currentAssignmentWardIds: number[];
};
type ReportForm = Omit<
  Report,
  "id" | "wardName" | "reporterName" | "submittedAt" | "updatedAt"
>;

const EMPTY_FORM: ReportForm = {
  wardId: 0,
  weekStart: "",
  status: "draft",
  sacramentalObservation: "",
  punctualityState: "",
  punctualityNote: "",
  wardCouncilObservation: "",
  followupState: "",
  followupNote: "",
  missionaryObservation: "",
  otherObservation: "",
  scheduleState: "",
  scheduleNote: "",
};

const attentionLabels: Record<Exclude<ReportState, "">, string> = {
  sin_novedad: "Sin novedad",
  destacable: "Destacable",
  requiere_atencion: "Requiere atención",
};

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayOf(date = new Date()) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
  return isoDay(current);
}

function moveWeek(week: string, amount: number) {
  const date = new Date(`${week}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return isoDay(date);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function weekLabel(week: string, includeYear = true) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(`${week}T00:00:00Z`));
}

const organizationLabels: Record<ReportScope, string> = {
  primary: "Primaria",
  relief_society: "Sociedad de Socorro",
  young_women: "Mujeres Jóvenes",
  young_men: "Hombres Jóvenes",
  high_council: "Sumo Consejo",
  jas: "Jóvenes Adultos Solteros (JAS)",
  single_adults: "Adultos Solteros (AS)",
  temple_family_history: "Templo e Historia Familiar",
  missionary_work: "Obra Misional",
  self_reliance: "Autosuficiencia",
  seminary: "Seminario",
  sunday_school: "Escuela Dominical",
};

const TEXT_LIMIT = 5000;

function CharacterCount({ value }: { value: string }) {
  return <span className="character-count" aria-live="polite">{value.length.toLocaleString("es-CL")} / {TEXT_LIMIT.toLocaleString("es-CL")}</span>;
}

function dateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function stateTone(state: ReportState) {
  if (state === "requiere_atencion") return "danger";
  if (state === "destacable") return "success";
  return "neutral";
}

function reportNeedsAttention(report: Report) {
  return [report.punctualityState, report.followupState, report.scheduleState].includes(
    "requiere_atencion",
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function responseJson(response: Response) {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const error = new Error(String(payload.error ?? "No fue posible continuar.")) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function PortalClient() {
  const currentWeek = useMemo(() => mondayOf(), []);
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [activeView, setActiveView] = useState("stake");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState(0);
  const [form, setForm] = useState<ReportForm>({ ...EMPTY_FORM, weekStart });
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [mobileNav, setMobileNav] = useState(false);

  const weekOptions = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => moveWeek(currentWeek, 2 - index)),
    [currentWeek],
  );

  const refresh = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetch("/api/portal", { cache: "no-store" });
      const payload = (await responseJson(response)) as unknown as PortalData;
      setData(payload);
      setSelectedWardId((current) =>
        payload.wards.some((ward) => ward.id === current)
          ? current
          : (payload.wards[0]?.id ?? 0),
      );
      if (payload.currentMember.role !== "admin") {
        setActiveView((view) => (view === "stake" || view === "admin" ? "report" : view));
      } else {
        setActiveView((view) => (view === "report" ? "stake" : view));
      }
    } catch (error) {
      if (error instanceof Error && (error as Error & { status?: number }).status === 401) {
        setAuthRequired(true);
      }
      setLoadError(error instanceof Error ? error.message : "No fue posible cargar el portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!data) return;
    const existing = data.reports.find(
      (report) => report.wardId === selectedWardId && report.weekStart === weekStart,
    );
    setForm(
      existing
        ? {
            wardId: existing.wardId,
            weekStart: existing.weekStart,
            status: existing.status,
            sacramentalObservation: existing.sacramentalObservation,
            punctualityState: existing.punctualityState,
            punctualityNote: existing.punctualityNote,
            wardCouncilObservation: existing.wardCouncilObservation,
            followupState: existing.followupState,
            followupNote: existing.followupNote,
            missionaryObservation: existing.missionaryObservation,
            otherObservation: existing.otherObservation,
            scheduleState: existing.scheduleState,
            scheduleNote: existing.scheduleNote,
          }
        : { ...EMPTY_FORM, wardId: selectedWardId, weekStart },
    );
  }, [data, selectedWardId, weekStart]);

  const post = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return responseJson(response);
  }, []);

  useEffect(() => {
    if (!data || !selectedWardId || data.currentMember.reportScope !== "high_council") return;
    const existing = data.reports.find((report) => report.wardId === selectedWardId && report.weekStart === weekStart);
    const comparable = { ...form, wardId: selectedWardId, weekStart, status: "draft" as const };
    const stored = existing ? {
      wardId: existing.wardId, weekStart: existing.weekStart, status: "draft" as const,
      sacramentalObservation: existing.sacramentalObservation, punctualityState: existing.punctualityState, punctualityNote: "",
      wardCouncilObservation: existing.wardCouncilObservation, followupState: existing.followupState, followupNote: "",
      missionaryObservation: existing.missionaryObservation, otherObservation: existing.otherObservation,
      scheduleState: existing.scheduleState, scheduleNote: "",
    } : { ...EMPTY_FORM, wardId: selectedWardId, weekStart };
    if (JSON.stringify(comparable) === JSON.stringify(stored)) return;
    setAutoSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        await post({ action: "save_report", ...form, wardId: selectedWardId, weekStart, status: "draft" });
        setAutoSaveState("saved");
      } catch (error) {
        setAutoSaveState("idle");
        toast.error(error instanceof Error ? error.message : "No fue posible guardar automáticamente.");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, form, post, selectedWardId, weekStart]);

  const signIn = async (username: string, password: string) => {
    setAuthBusy(true);
    try {
      await post({ action: "login", username, password });
      setAuthRequired(false);
      setLoadError("");
      setLoading(true);
      await refresh();
    } catch (error) {
      throw error;
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await post({ action: "logout" });
    window.location.reload();
  };

  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: Record<string, unknown>, options?: { signal: AbortSignal }) => unknown;
        };
      }
    ).modelContext;
    if (!modelContext?.registerTool || !data) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await modelContext.registerTool(
        {
          name: "open_monthly_report",
          title: "Abrir informe mensual",
          description: "Abre el formulario de un barrio y un mes disponibles en el portal.",
          inputSchema: {
            type: "object",
            properties: {
              wardId: { type: "number" },
              weekStart: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            },
            required: ["wardId", "weekStart"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: (input: unknown) => {
            const candidate = input as { wardId?: number; weekStart?: string };
            if (!data.wards.some((ward) => ward.id === candidate.wardId)) {
              throw new Error("Barrio no disponible");
            }
            if (!candidate.weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.weekStart)) {
              throw new Error("Mes no válida");
            }
            setSelectedWardId(candidate.wardId!);
            setWeekStart(candidate.weekStart);
            setActiveView("report");
            return { opened: true, wardId: candidate.wardId, weekStart: candidate.weekStart };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [data]);

  const saveReport = async (status: "draft" | "submitted") => {
    if (!selectedWardId) return;
    setSaving(true);
    try {
      await post({ action: "save_report", ...form, wardId: selectedWardId, weekStart, status });
      toast.success(status === "submitted" ? "Informe enviado a la Estaca" : "Borrador guardado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar.");
    } finally {
      setSaving(false);
    }
  };

  const openReport = (wardId: number, week: string) => {
    setSelectedWardId(wardId);
    setWeekStart(week);
    setActiveView("report");
    setMobileNav(false);
  };

  if (authRequired) return <LoginScreen busy={authBusy} onLogin={signIn} />;
  if (loading) return <PortalLoading />;
  if (loadError || !data) {
    return (
      <AccessState
        title="Aún no podemos abrir tu panel"
        message={loadError || "No fue posible cargar la información."}
        onRetry={() => {
          setLoading(true);
          void refresh();
        }}
      />
    );
  }

  const isAdmin = data.currentMember.role === "admin";
  const navItems = [
    ...(isAdmin
      ? [{ value: "stake", label: "Resumen Estaca", icon: LayoutDashboard }]
      : []),
    ...(!isAdmin ? [{ value: "report", label: data.currentMember.reportScope === "high_council" ? "Informe mensual" : "Informe de organización", icon: FilePenLine }] : []),
    { value: "shared", label: "Consulta de informes", icon: BookOpenCheck },
    ...(isAdmin ? [{ value: "approvals", label: "Aprobaciones", icon: ShieldCheck }] : []),
    { value: "history", label: "Historial", icon: FileClock },
    ...(!isAdmin ? [{ value: "help", label: "Manual de ayuda", icon: HelpCircle }] : []),
    ...(isAdmin
      ? [{ value: "admin", label: "Administración", icon: Settings2 }]
      : []),
  ];

  const viewTitles: Record<string, { eyebrow: string; title: string }> = {
    stake: { eyebrow: "Vista Estaca", title: "Resumen mensual" },
    report: { eyebrow: "Asignación de barrio", title: data.currentMember.reportScope === "high_council" ? "Informe mensual" : organizationLabels[data.currentMember.reportScope] },
    history: { eyebrow: "Seguimiento", title: "Historial de informes" },
    shared: { eyebrow: isAdmin ? "Lectura integrada" : "Información autorizada", title: "Consulta por barrio" },
    approvals: { eyebrow: "Revisión de Estaca", title: "Aprobaciones" },
    help: { eyebrow: "Orientación", title: "Manual de ayuda" },
    admin: { eyebrow: "Configuración", title: "Barrios y accesos" },
  };
  const title = viewTitles[activeView] ?? viewTitles.report;

  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => {
        setActiveView(value);
        setMobileNav(false);
      }}
      orientation="vertical"
      className="portal-shell"
    >
      <aside className={`portal-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span>EÑ</span>
          </div>
          <div>
            <strong>Estaca Ñuñoa</strong>
            <span>Seguimiento de Estaca</span>
          </div>
          <Button
            className="mobile-close"
            variant="ghost"
            size="icon"
            onClick={() => setMobileNav(false)}
            aria-label="Cerrar menú"
          >
            <X />
          </Button>
        </div>

        <div className="sidebar-week">
          <CalendarDays />
          <div>
            <span>Mes en curso</span>
            <strong>{weekLabel(currentWeek, false)}</strong>
          </div>
        </div>

        <TabsList className="portal-nav" variant="line">
          {navItems.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              <item.icon />
              <span>{item.label}</span>
              <ChevronRight className="nav-arrow" />
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="sidebar-profile">
          <div className="profile-avatar">{initials(data.currentMember.displayName)}</div>
          <div>
            <strong>{data.currentMember.displayName}</strong>
            <span>{isAdmin ? "Administración Estaca" : organizationLabels[data.currentMember.reportScope]}</span>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => void signOut()}><LogOut /></Button>
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} />}

      <section className="portal-content">
        <header className="portal-header">
          <div className="header-title">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Abrir menú"
            >
              <Menu />
            </Button>
            <div>
              <span>{title.eyebrow}</span>
              <h1>{title.title}</h1>
            </div>
          </div>
          {(
            <div className="week-picker">
              <span>Mes</span>
              <Select value={weekStart} onValueChange={setWeekStart}>
                <SelectTrigger aria-label="Seleccionar mes">
                  <CalendarDays />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {weekOptions.map((week) => (
                    <SelectItem key={week} value={week}>
                      {weekLabel(week)}{week === currentWeek ? " · actual" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        <main className="workspace">
          {isAdmin && (
            <TabsContent value="stake">
              <StakeSummary data={data} weekStart={weekStart} />
            </TabsContent>
          )}
          {!isAdmin && <TabsContent value="report">
            {data.currentMember.reportScope === "high_council" ? <WeeklyReport
              data={data}
              weekStart={weekStart}
              selectedWardId={selectedWardId}
              setSelectedWardId={setSelectedWardId}
              form={form}
              setForm={setForm}
              saving={saving}
              onSave={saveReport}
              autoSaveState={autoSaveState}
              onGoAdmin={() => setActiveView("admin")}
            /> : <OrganizationReportView data={data} monthStart={weekStart} refresh={refresh} post={post} />}
          </TabsContent>}
          <TabsContent value="history">
            <HistoryView data={data} onOpenReport={openReport} />
          </TabsContent>
          {!isAdmin && <TabsContent value="help"><HelpView data={data} /></TabsContent>}
          <TabsContent value="shared"><SharedInformationView data={data} monthStart={weekStart} /></TabsContent>
          {isAdmin && <TabsContent value="approvals"><OrganizationApprovalPanel data={data} monthStart={weekStart} post={post} refresh={refresh} /></TabsContent>}
          {isAdmin && (
            <TabsContent value="admin">
              <AdminView data={data} refresh={refresh} post={post} />
            </TabsContent>
          )}
        </main>

        <TabsList className="mobile-bottom-nav" variant="line" aria-label="Navegación principal">
          {navItems.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              <item.icon />
              <span>{item.label.replace("Resumen ", "").replace("Informe ", "")}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <small className="developer-credit">Desarrollado por Williams Hewstone</small>
      </section>
      <Toaster position="top-right" richColors />
    </Tabs>
  );
}

function PortalLoading() {
  return (
    <div className="portal-loading">
      <div className="brand-mark"><span>EÑ</span></div>
      <div className="loading-line" />
      <p>Preparando el resumen mensual…</p>
    </div>
  );
}

function HelpView({ data }: { data: PortalData }) {
  const isHighCouncil = data.currentMember.reportScope === "high_council";
  const steps = isHighCouncil
    ? [
        ["Selecciona el mes y el barrio", "Solo aparecerán los barrios que la administración te haya asignado."],
        ["Completa el informe mensual", "Escribe únicamente situaciones relevantes en Reunión Sacramental, Consejo de Barrio, Obra Misional y Templo, u Otros enfoques."],
        ["Revisa los puntos obligatorios", "En cada punto rojo selecciona Sin novedad, Destacable o Requiere atención."],
        ["Envía el informe", "Los textos se guardan automáticamente, pero debes pulsar Enviar informe para dejarlo formalmente registrado."],
        ["Consulta información del barrio", "En Consulta de informes puedes leer los aportes aprobados de las organizaciones de tus barrios."],
      ]
    : [
        ["Selecciona el mes", `El formulario corresponde exclusivamente a ${organizationLabels[data.currentMember.reportScope]}.`],
        ["Informa por cada barrio", "Escribe en cada tarjeta únicamente lo importante ocurrido durante el mes."],
        ["Espera el guardado automático", "El estado Guardado · pendiente confirma que la información llegó para revisión."],
        ["Aprobación de Estaca", "La información no será visible para otros usuarios hasta que un administrador la revise y publique."],
        ["Consulta e historial", "Podrás consultar información aprobada de tu organización en los barrios que tengas autorizados."],
      ];
  return <div className="view-stack help-view">
    <section className="history-heading"><div><span className="section-kicker">Guía según tu perfil</span><h2>{isHighCouncil ? "Sumo Consejo asignado" : organizationLabels[data.currentMember.reportScope]}</h2><p>Pasos básicos para ingresar y consultar información correctamente.</p></div><Badge variant="outline"><HelpCircle /> Ayuda</Badge></section>
    <section className="help-grid">{steps.map(([title, description], index) => <article className="panel help-card" key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</section>
    <section className="panel help-note"><ShieldCheck /><div><strong>Privacidad de la información</strong><p>Solo puedes consultar información según tu perfil y los barrios que te fueron asignados. Si necesitas otro barrio, solicítalo a la administración de Estaca.</p></div></section>
  </div>;
}

function LoginScreen({ busy, onLogin }: { busy: boolean; onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await onLogin(username, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Usuario o contraseña incorrectos.");
    }
  };
  return (
    <main className="access-page">
      <form className="access-card login-card" onSubmit={submit}>
        <div className="access-icon"><LockKeyhole /></div>
        <span className="access-eyebrow">Portal privado</span>
        <h1>Informes Estaca Ñuñoa</h1>
        <p>Ingresa con tu usuario asignado para registrar el informe de tu barrio o revisar el consolidado de Estaca.</p>
        <div className="dialog-field login-field"><label htmlFor="login-username">Usuario</label><Input id="login-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Tu usuario" autoFocus /></div>
        <div className="dialog-field login-field"><label htmlFor="login-password">Contraseña</label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" /></div>
        {error && <p className="login-error"><AlertCircle /> {error}</p>}
        <Button type="submit" className="login-submit" disabled={busy}>{busy ? "Validando…" : "Ingresar"} <ArrowRight /></Button>
      </form>
    </main>
  );
}

function AccessState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="access-page">
      <div className="access-card">
        <div className="access-icon"><ShieldCheck /></div>
        <span className="access-eyebrow">Acceso protegido</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="access-actions">
          <Button onClick={onRetry}>Intentar nuevamente</Button>
        </div>
      </div>
    </main>
  );
}

function StakeSummary({
  data,
  weekStart,
}: {
  data: PortalData;
  weekStart: string;
}) {
  const [detailWardId, setDetailWardId] = useState<number | null>(null);
  const weeklyReports = data.reports.filter((report) => report.weekStart === weekStart);
  const reportByWard = new Map(weeklyReports.map((report) => [report.wardId, report]));
  const submitted = weeklyReports.filter((report) => report.status === "submitted");
  const pending = data.wards.length - submitted.length;
  const attention = submitted.filter(reportNeedsAttention);
  const highlights = submitted.filter((report) =>
    [report.punctualityState, report.followupState, report.scheduleState].includes("destacable"),
  );
  const progress = data.wards.length ? Math.round((submitted.length / data.wards.length) * 100) : 0;
  const detailWard = data.wards.find((ward) => ward.id === detailWardId) ?? null;
  const detailReport = detailWardId ? reportByWard.get(detailWardId) ?? null : null;
  const detailOrganizations = detailWardId
    ? data.organizationReports.filter((item) => item.wardId === detailWardId && item.monthStart === weekStart)
    : [];

  return (
    <div className="view-stack">
      <section className="stake-hero">
        <div className="hero-copy">
          <div className="eyebrow-pill"><CalendarDays /> {weekLabel(weekStart)}</div>
          <h2>Un mes, toda la Estaca</h2>
          <p>
            Estado de entrega y observaciones relevantes de todos los barrios en un solo lugar.
          </p>
        </div>
        <div className="coverage-orbit" style={{ "--coverage": `${progress * 3.6}deg` } as React.CSSProperties}>
          <div>
            <strong>{progress}%</strong>
            <span>reportado</span>
          </div>
        </div>
      </section>

      {data.wards.length === 0 ? (
        <EmptyWards />
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard icon={<CheckCircle2 />} label="Informes recibidos" value={`${submitted.length}/${data.wards.length}`} tone="teal" />
            <MetricCard icon={<Clock3 />} label="Barrios pendientes" value={String(Math.max(0, pending))} tone="gold" />
            <MetricCard icon={<AlertCircle />} label="Requieren atención" value={String(attention.length)} tone="red" />
            <MetricCard icon={<Sparkles />} label="Aspectos destacables" value={String(highlights.length)} tone="blue" />
          </div>

          <section className="panel coverage-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">Cobertura mensual</span>
                <h3>Estado por barrio</h3>
              </div>
              <Badge variant="outline">{data.wards.length} barrios</Badge>
            </div>
            <Progress value={progress} className="coverage-progress" />
            <div className="ward-status-grid">
              {data.wards.map((ward) => {
                const report = reportByWard.get(ward.id);
                const status = report?.status === "submitted" ? "submitted" : report ? "draft" : "pending";
                return (
                  <button key={ward.id} className="ward-status" onClick={() => setDetailWardId(ward.id)}>
                    <span className={`status-dot ${status}`} />
                    <div>
                      <strong>{ward.name}</strong>
                      <span>
                        {status === "submitted"
                          ? `Enviado por ${report?.reporterName}`
                          : status === "draft"
                            ? "Borrador guardado"
                            : "Pendiente de informe"}
                      </span>
                    </div>
                    {report && reportNeedsAttention(report) && <Badge variant="destructive">Atención</Badge>}
                    <ChevronRight />
                  </button>
                );
              })}
            </div>
          </section>

          <WeeklyDigest reports={submitted} />
        </>
      )}

      <Dialog open={Boolean(detailWard)} onOpenChange={(open) => !open && setDetailWardId(null)}>
        <DialogContent className="history-detail-dialog">
          {detailWard && <>
            <DialogHeader>
              <span className="section-kicker">Resumen del barrio · {weekLabel(weekStart)}</span>
              <DialogTitle>{detailWard.name}</DialogTitle>
              <DialogDescription>Informe de Sumo Consejo e informaciones de organizaciones registradas durante el mes.</DialogDescription>
            </DialogHeader>

            <div className="panel-heading">
              <div><span className="section-kicker">Sumo Consejo</span><h3>Informe mensual</h3></div>
              {detailReport && <Badge variant={detailReport.status === "submitted" ? "default" : "secondary"}>{detailReport.status === "submitted" ? "Enviado" : "Borrador"}</Badge>}
            </div>
            {detailReport ? <div className="history-detail-grid">
              <section>
                <span>01</span><div><strong>Reunión Sacramental</strong><p>{detailReport.sacramentalObservation || "Sin observaciones."}</p><StatePill state={detailReport.punctualityState} />{detailReport.punctualityNote && <small>{detailReport.punctualityNote}</small>}</div>
              </section>
              <section>
                <span>02</span><div><strong>Consejo de Barrio</strong><p>{detailReport.wardCouncilObservation || "Sin observaciones."}</p><StatePill state={detailReport.followupState} />{detailReport.followupNote && <small>{detailReport.followupNote}</small>}</div>
              </section>
              <section>
                <span>03</span><div><strong>Obra Misional y Obra de Templo e Historia Familiar</strong><p>{detailReport.missionaryObservation || "Sin observaciones."}</p></div>
              </section>
              <section>
                <span>04</span><div><strong>Otros enfoques relevantes</strong><p>{detailReport.otherObservation || "Sin observaciones."}</p><StatePill state={detailReport.scheduleState} />{detailReport.scheduleNote && <small>{detailReport.scheduleNote}</small>}</div>
              </section>
            </div> : <div className="mini-empty">Este barrio todavía no tiene informe de Sumo Consejo para el mes seleccionado.</div>}

            <div className="panel-heading">
              <div><span className="section-kicker">Organizaciones</span><h3>Informaciones del mes</h3></div>
              <Badge variant="outline">{detailOrganizations.length} registros</Badge>
            </div>
            {detailOrganizations.length ? <div className="organization-history-list">
              {detailOrganizations.map((item) => <article key={item.id}>
                <div className="organization-history-copy">
                  <div><strong>{organizationLabels[item.organization]}</strong><span>{item.reporterName || "Sin responsable"} · {dateTime(item.updatedAt)}</span></div>
                  <p>{item.observation || "Sin observación escrita."}</p>
                </div>
                <Badge className="organization-history-status" variant={item.approvalStatus === "approved" ? "default" : "secondary"}>{item.approvalStatus === "approved" ? "Publicado" : "Pendiente"}</Badge>
              </article>)}
            </div> : <div className="mini-empty">No hay informaciones de organizaciones para este barrio durante el mes seleccionado.</div>}

            <DialogFooter><Button variant="outline" onClick={() => setDetailWardId(null)}>Cerrar</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function WeeklyDigest({ reports }: { reports: Report[] }) {
  type DigestEntry = { ward: string; text: string; state?: ReportState };
  type DigestSection = { title: string; icon: typeof BookOpenCheck; entries: DigestEntry[] };
  const sections: DigestSection[] = [
    {
      title: "Reunión Sacramental",
      icon: BookOpenCheck,
      entries: reports.flatMap((report) => {
        const rows: { ward: string; text: string; state?: ReportState }[] = [];
        if (report.sacramentalObservation) rows.push({ ward: report.wardName, text: report.sacramentalObservation });
        if (report.punctualityState !== "sin_novedad" && report.punctualityState) {
          rows.push({ ward: report.wardName, text: report.punctualityNote || "Puntualidad informada sin comentario.", state: report.punctualityState });
        }
        return rows;
      }),
    },
    {
      title: "Consejo de Barrio",
      icon: Users,
      entries: reports.flatMap((report) => {
        const rows: { ward: string; text: string; state?: ReportState }[] = [];
        if (report.wardCouncilObservation) rows.push({ ward: report.wardName, text: report.wardCouncilObservation });
        if (report.followupState !== "sin_novedad" && report.followupState) {
          rows.push({ ward: report.wardName, text: report.followupNote || "Seguimiento informado sin comentario.", state: report.followupState });
        }
        return rows;
      }),
    },
    {
      title: "Obra Misional y Templo",
      icon: Gauge,
      entries: reports
        .filter((report) => report.missionaryObservation)
        .map((report) => ({ ward: report.wardName, text: report.missionaryObservation })),
    },
    {
      title: "Otros enfoques",
      icon: Sparkles,
      entries: reports.flatMap((report) => {
        const rows: { ward: string; text: string; state?: ReportState }[] = [];
        if (report.otherObservation) rows.push({ ward: report.wardName, text: report.otherObservation });
        if (report.scheduleState !== "sin_novedad" && report.scheduleState) {
          rows.push({ ward: report.wardName, text: report.scheduleNote || "Horario dominical informado sin comentario.", state: report.scheduleState });
        }
        return rows;
      }),
    },
  ];

  return (
    <section className="panel digest-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Consolidado de informes</span>
          <h3>Resumen de la mes</h3>
        </div>
        <span className="muted-count">Solo puntos reportados</span>
      </div>
      {reports.length === 0 ? (
        <div className="digest-empty"><FileClock /><p>Aún no hay informes enviados para consolidar.</p></div>
      ) : (
        <div className="digest-grid">
          {sections.map((section) => (
            <article key={section.title} className="digest-card">
              <div className="digest-title"><section.icon /><h4>{section.title}</h4></div>
              {section.entries.length ? (
                <div className="digest-entries">
                  {section.entries.map((entry, index) => (
                    <div key={`${entry.ward}-${index}`} className="digest-entry">
                      <div>
                        <Badge variant="outline">{entry.ward}</Badge>
                        {entry.state && <StatePill state={entry.state} />}
                      </div>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="digest-none"><Check /> Sin observaciones relevantes.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyWards() {
  return (
    <section className="panel empty-state">
      <div className="empty-icon"><Building2 /></div>
      <h3>Agrega los barrios de la Estaca</h3>
      <p>Una vez registrados, aparecerán aquí para controlar la entrega mensual y abrir cada informe.</p>
    </section>
  );
}

function StatePill({ state }: { state: ReportState }) {
  if (!state) return null;
  return <span className={`state-pill ${stateTone(state)}`}>{attentionLabels[state]}</span>;
}

function WeeklyReport({
  data,
  weekStart,
  selectedWardId,
  setSelectedWardId,
  form,
  setForm,
  saving,
  autoSaveState,
  onSave,
  onGoAdmin,
}: {
  data: PortalData;
  weekStart: string;
  selectedWardId: number;
  setSelectedWardId: (id: number) => void;
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  saving: boolean;
  autoSaveState: "idle" | "saving" | "saved";
  onSave: (status: "draft" | "submitted") => void;
  onGoAdmin: () => void;
}) {
  const current = data.reports.find(
    (report) => report.wardId === selectedWardId && report.weekStart === weekStart,
  );
  const ward = data.wards.find((item) => item.id === selectedWardId);
  const update = <K extends keyof ReportForm>(key: K, value: ReportForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  if (!data.wards.length) {
    return (
      <section className="panel empty-state">
        <div className="empty-icon"><Building2 /></div>
        <h3>No hay barrios disponibles</h3>
        <p>{data.currentMember.role === "admin" ? "Registra el primer barrio para comenzar a recibir informes." : "Solicita a la administración que te asigne un barrio."}</p>
        {data.currentMember.role === "admin" && <Button onClick={onGoAdmin}><Plus /> Ir a administración</Button>}
      </section>
    );
  }

  return (
    <div className="report-layout">
      <section className="report-intro">
        <div>
          <span className="section-kicker">Informe mensual · {weekLabel(weekStart)}</span>
          <h2>{ward?.name ?? "Selecciona un barrio"}</h2>
          <p>Completa solo lo relevante. Los tres puntos en rojo son obligatorios.</p>
        </div>
        <div className="report-controls">
          <Select value={String(selectedWardId)} onValueChange={(value) => setSelectedWardId(Number(value))}>
            <SelectTrigger aria-label="Seleccionar barrio"><Building2 /><SelectValue /></SelectTrigger>
            <SelectContent>
              {data.wards.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {current ? (
            <Badge variant={current.status === "submitted" ? "default" : "secondary"}>
              {current.status === "submitted" ? <CheckCircle2 /> : <Save />}
              {current.status === "submitted" ? "Enviado" : "Borrador"}
            </Badge>
          ) : <Badge variant="outline">Nuevo informe</Badge>}
        </div>
      </section>

      <div className="instruction-strip">
        <div><AlertCircle /></div>
        <p><strong>Formato simplificado:</strong> escribe solo lo relevante. Los cambios quedan guardados automáticamente; en los puntos obligatorios basta indicar “Sin novedad”.</p>
      </div>

      <div className="report-sections">
        <ReportSection
          number="01"
          title="Reunión Sacramental"
          description="Observaciones relevantes sobre el desarrollo de la reunión."
          optionalFocus={["Planificación", "Reunión centrada en Cristo", "Participación de jóvenes y nuevos conversos", "Testimonios"]}
          observation={form.sacramentalObservation}
          onObservation={(value) => update("sacramentalObservation", value)}
          requiredLabel="Puntualidad de inicio y término"
          requiredState={form.punctualityState}
          requiredNote={form.punctualityNote}
          onState={(value) => update("punctualityState", value)}
          onNote={(value) => update("punctualityNote", value)}
        />
        <ReportSection
          number="02"
          title="Consejo de Barrio"
          description="Seguimiento de la reunión y del trabajo centrado en las personas."
          optionalFocus={["Frecuencia ideal mensual", "Invitación a misioneros una vez al mes", "Agenda centrada en personas, jóvenes y nuevos conversos", "Revisión de metas y planes de acción"]}
          observation={form.wardCouncilObservation}
          onObservation={(value) => update("wardCouncilObservation", value)}
          requiredLabel="Seguimiento a asignaciones y nombre al templo para nuevos conversos"
          requiredState={form.followupState}
          requiredNote={form.followupNote}
          onState={(value) => update("followupState", value)}
          onNote={(value) => update("followupNote", value)}
        />
        <ReportSection
          number="03"
          title="Obra Misional y Obra de Templo e Historia Familiar"
          description="Incluye solo avances o dificultades que sea importante conocer."
          optionalFocus={["Frecuencia de reuniones de coordinación", "Definición de asignaciones y planes", "Participación de líderes de Sociedad de Socorro y Cuórum"]}
          observation={form.missionaryObservation}
          onObservation={(value) => update("missionaryObservation", value)}
        />
        <ReportSection
          number="04"
          title="Otros enfoques relevantes"
          description="Cualquier otra situación importante para el Consejo de Estaca."
          optionalFocus={[]}
          observation={form.otherObservation}
          onObservation={(value) => update("otherObservation", value)}
          requiredLabel="Funcionamiento del nuevo horario de reuniones dominicales"
          requiredState={form.scheduleState}
          requiredNote={form.scheduleNote}
          onState={(value) => update("scheduleState", value)}
          onNote={(value) => update("scheduleNote", value)}
        />
      </div>

      <footer className="report-footer">
        <div>
          <Save /><span>{autoSaveState === "saving" ? "Guardando automáticamente…" : autoSaveState === "saved" ? "Cambios guardados" : current?.reporterName ? <>Último registro por <strong>{current.reporterName}</strong><small>{dateTime(current.updatedAt)}</small></> : <>Se guardará a nombre de <strong>{data.currentMember.displayName}</strong></>}</span>
        </div>
        <div>
          <Button disabled={saving} onClick={() => onSave("submitted")}><Send /> {saving ? "Guardando…" : "Enviar informe"}</Button>
        </div>
      </footer>
    </div>
  );
}

function ReportSection({
  number,
  title,
  description,
  optionalFocus,
  observation,
  onObservation,
  requiredLabel,
  requiredState,
  requiredNote,
  onState,
  onNote,
}: {
  number: string;
  title: string;
  description: string;
  optionalFocus: string[];
  observation: string;
  onObservation: (value: string) => void;
  requiredLabel?: string;
  requiredState?: ReportState;
  requiredNote?: string;
  onState?: (value: ReportState) => void;
  onNote?: (value: string) => void;
}) {
  return (
    <section className="report-section panel">
      <div className="section-number">{number}</div>
      <div className="section-main">
        <div className="section-heading"><div><h3>{title}</h3><p>{description}</p></div><Badge variant="outline">Opcional</Badge></div>
        <label className="field-label" htmlFor={`observation-${number}`}>Observaciones importantes</label>
        <Textarea id={`observation-${number}`} value={observation} maxLength={TEXT_LIMIT} onChange={(event) => onObservation(event.target.value)} placeholder="Escribe solo si existe algo destacable o un punto de mejora…" rows={4} />
        <CharacterCount value={observation} />
      </div>
      <aside className="attention-note">
        <span className="attention-title">Puntos de atención</span>
        {optionalFocus.length > 0 && <ul>{optionalFocus.map((focus) => <li key={focus}>{focus}</li>)}</ul>}
        {requiredLabel && onState && onNote && (
          <div className="required-focus">
            <span><AlertCircle /> Reporte obligatorio</span>
            <strong>{requiredLabel}</strong>
            <Select value={requiredState || undefined} onValueChange={(value) => onState(value as ReportState)}>
              <SelectTrigger aria-label={`Estado de ${requiredLabel}`}><SelectValue placeholder="Selecciona estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sin_novedad">Sin novedad</SelectItem>
                <SelectItem value="destacable">Destacable</SelectItem>
                <SelectItem value="requiere_atencion">Requiere atención</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </aside>
    </section>
  );
}

function OrganizationReportView({
  data,
  monthStart,
  refresh,
  post,
}: {
  data: PortalData;
  monthStart: string;
  refresh: () => Promise<void>;
  post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
}) {
  const organization = data.currentMember.reportScope as OrganizationScope;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingWard, setSavingWard] = useState<number | null>(null);
  const [savedWard, setSavedWard] = useState<number | null>(null);
  const timers = useRef<Record<number, number>>({});

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const ward of data.wards) {
      next[ward.id] = data.organizationReports.find((item) => item.wardId === ward.id && item.monthStart === monthStart && item.organization === organization)?.observation ?? "";
    }
    setDrafts(next);
  }, [data, monthStart, organization]);

  const updateObservation = (wardId: number, observation: string) => {
    setDrafts((current) => ({ ...current, [wardId]: observation }));
    setSavingWard(wardId);
    setSavedWard(null);
    if (timers.current[wardId]) window.clearTimeout(timers.current[wardId]);
    timers.current[wardId] = window.setTimeout(async () => {
      try {
        await post({ action: "save_organization_report", wardId, monthStart, organization, observation });
        await refresh();
        setSavingWard(null);
        setSavedWard(wardId);
      } catch (error) {
        setSavingWard(null);
        toast.error(error instanceof Error ? error.message : "No fue posible guardar automáticamente.");
      }
    }, 900);
  };

  return (
    <div className="view-stack organization-view">
      <section className="report-intro organization-intro">
        <div>
          <span className="section-kicker">Informe mensual · {weekLabel(monthStart)}</span>
          <h2>{organizationLabels[organization]}</h2>
          <p>Registra una observación por cada barrio. Todo se guarda automáticamente mientras escribes.</p>
        </div>
        <Badge variant="outline"><Users /> {data.wards.length} barrios</Badge>
      </section>
      <section className="organization-grid">
        {data.wards.map((ward) => {
          const existing = data.organizationReports.find((item) => item.wardId === ward.id && item.monthStart === monthStart && item.organization === organization);
          return (
          <article className="panel organization-card" key={ward.id}>
            <div className="organization-card-heading">
              <div><span className="section-kicker">Barrio</span><h3>{ward.name}</h3></div>
              <span className={`autosave-indicator ${savingWard === ward.id ? "saving" : savedWard === ward.id ? "saved" : ""}`}>
                {savingWard === ward.id ? "Guardando…" : savedWard === ward.id ? "Guardado · pendiente" : existing?.approvalStatus === "approved" ? "Aprobado" : existing ? "Pendiente de aprobación" : "Automático"}
              </span>
            </div>
            <label htmlFor={`organization-${ward.id}`}>Observación del mes</label>
            <Textarea id={`organization-${ward.id}`} value={drafts[ward.id] ?? ""} maxLength={TEXT_LIMIT} onChange={(event) => updateObservation(ward.id, event.target.value)} placeholder={`Escribe lo observado por ${organizationLabels[organization]} en ${ward.name}…`} rows={5} />
            <CharacterCount value={drafts[ward.id] ?? ""} />
          </article>
          );
        })}
      </section>
    </div>
  );
}

function SharedInformationView({ data, monthStart }: { data: PortalData; monthStart: string }) {
  const isAdmin = data.currentMember.role === "admin";
  const isHighCouncil = data.currentMember.reportScope === "high_council";
  const visibleWardIds = isAdmin ? data.wards.map((ward) => ward.id) : data.currentAssignmentWardIds;
  const [wardFilter, setWardFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const organizationRows = data.organizationReports.filter((item) =>
    item.monthStart === monthStart &&
    visibleWardIds.includes(item.wardId) &&
    (isAdmin || item.approvalStatus === "approved") &&
    (sourceFilter === "all" || item.organization === sourceFilter),
  );
  const councilRows = (isAdmin || isHighCouncil) && (sourceFilter === "all" || sourceFilter === "high_council")
    ? data.reports.filter((item) => item.weekStart === monthStart && visibleWardIds.includes(item.wardId))
    : [];
  const selectedWardIds = wardFilter === "all" ? visibleWardIds : visibleWardIds.filter((id) => id === Number(wardFilter));
  const availableOrganizations = Array.from(new Set(data.organizationReports.map((item) => item.organization)));
  return (
    <div className="view-stack shared-view">
      <section className="history-heading">
        <div><span className="section-kicker">Vista consolidada · {weekLabel(monthStart)}</span><h2>Informes por barrio</h2><p>{isAdmin ? "Consulta toda la información de la Estaca por barrio y origen." : isHighCouncil ? "Consulta los informes y aportes aprobados de tus barrios asignados." : `Consulta la información aprobada de ${organizationLabels[data.currentMember.reportScope]} en tus barrios asignados.`}</p></div>
        <Badge variant="outline"><ShieldCheck /> {organizationRows.length + councilRows.length} registros</Badge>
      </section>
      <section className="panel report-browser-controls">
        <div><label>Barrio</label><Select value={wardFilter} onValueChange={setWardFilter}><SelectTrigger><Building2 /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los barrios</SelectItem>{visibleWardIds.map((wardId) => { const ward = data.wards.find((item) => item.id === wardId); return ward ? <SelectItem key={ward.id} value={String(ward.id)}>{ward.name}</SelectItem> : null; })}</SelectContent></Select></div>
        {(isAdmin || isHighCouncil) && <div><label>Tipo de información</label><Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger><BookOpenCheck /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda la información</SelectItem><SelectItem value="high_council">Sumo Consejo</SelectItem>{availableOrganizations.map((organization) => <SelectItem key={organization} value={organization}>{organizationLabels[organization]}</SelectItem>)}</SelectContent></Select></div>}
      </section>
      {visibleWardIds.length === 0 ? <section className="panel digest-empty"><Building2 /><p>Aún no tienes barrios asignados para consultar.</p></section> : (
        <section className="shared-information-grid">
          {selectedWardIds.map((wardId) => {
            const ward = data.wards.find((item) => item.id === wardId);
            const organizations = organizationRows.filter((item) => item.wardId === wardId);
            const council = councilRows.find((item) => item.wardId === wardId);
            const councilComments = council ? [["Reunión Sacramental", council.sacramentalObservation], ["Consejo de Barrio", council.wardCouncilObservation], ["Obra Misional y Templo", council.missionaryObservation], ["Otros enfoques", council.otherObservation]].filter(([, text]) => text) : [];
            const hasContent = organizations.length > 0 || councilComments.length > 0;
            return <article className="panel shared-ward-card" key={wardId}><div className="admin-ward-title"><Building2 /><div><span>Barrio</span><h3>{ward?.name ?? "Barrio"}</h3></div></div>{hasContent ? <div className="ward-comment-list">{councilComments.map(([label, text]) => <div className="ward-comment" key={label}><strong>Sumo Consejo · {label}</strong><p>{text}</p><small>{council?.reporterName} · {dateTime(council?.updatedAt ?? null)}</small></div>)}{organizations.map((item) => <div className="ward-comment organization" key={item.id}><strong>{organizationLabels[item.organization]}{isAdmin && item.approvalStatus !== "approved" ? " · Pendiente" : ""}</strong><p>{item.observation}</p><small>{item.reporterName} · {dateTime(item.updatedAt)}</small></div>)}</div> : <p className="ward-summary-empty">No hay información disponible para este mes y filtro.</p>}</article>;
          })}
        </section>
      )}
    </div>
  );
}

function HistoryView({ data, onOpenReport }: { data: PortalData; onOpenReport: (wardId: number, week: string) => void }) {
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailReport, setDetailReport] = useState<Report | null>(null);
  const isAdmin = data.currentMember.role === "admin";
  const showCouncilReports = isAdmin || data.currentMember.reportScope === "high_council";
  const filtered = data.reports.filter(
    (report) =>
      (wardFilter === "all" || report.wardId === Number(wardFilter)) &&
      (statusFilter === "all" || report.status === statusFilter),
  );
  const organizationHistory = data.organizationReports.filter((report) => wardFilter === "all" || report.wardId === Number(wardFilter));
  return (
    <div className="view-stack">
      <section className="history-heading">
        <div><span className="section-kicker">Registro permanente</span><h2>Informes anteriores</h2><p>Consulta cualquier mes y vuelve a abrir el detalle completo.</p></div>
        <div className="history-filters">
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger><Building2 /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos los barrios</SelectItem>{data.wards.map((ward) => <SelectItem key={ward.id} value={String(ward.id)}>{ward.name}</SelectItem>)}</SelectContent>
          </Select>
          {showCouncilReports && <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="submitted">Enviados</SelectItem><SelectItem value="draft">Borradores</SelectItem></SelectContent>
          </Select>}
        </div>
      </section>
      {showCouncilReports && <section className="panel table-panel">
        {filtered.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Mes</TableHead><TableHead>Barrio</TableHead><TableHead>Estado</TableHead><TableHead>Puntos</TableHead><TableHead>Responsable</TableHead><TableHead className="text-right">Detalle</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((report) => (
                <TableRow key={report.id}>
                  <TableCell><strong>{weekLabel(report.weekStart)}</strong></TableCell>
                  <TableCell>{report.wardName}</TableCell>
                  <TableCell><Badge variant={report.status === "submitted" ? "default" : "secondary"}>{report.status === "submitted" ? "Enviado" : "Borrador"}</Badge></TableCell>
                  <TableCell>{reportNeedsAttention(report) ? <StatePill state="requiere_atencion" /> : <span className="all-good"><Check /> Sin alertas</span>}</TableCell>
                  <TableCell><span className="responsible-cell">{report.reporterName || "-"}<small>{dateTime(report.updatedAt)}</small></span></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => isAdmin ? setDetailReport(report) : onOpenReport(report.wardId, report.weekStart)}>Abrir <ArrowRight /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <div className="digest-empty"><FileClock /><p>No hay informes que coincidan con los filtros.</p></div>}
      </section>}
      <section className="panel organization-history-panel">
        <div className="panel-heading"><div><span className="section-kicker">Organizaciones</span><h3>Historial de informaciones</h3></div><Badge variant="outline">{organizationHistory.length} registros</Badge></div>
        {organizationHistory.length ? <div className="organization-history-list">{organizationHistory.map((item) => <article key={item.id}><div className="organization-history-copy"><div><strong>{organizationLabels[item.organization]}</strong><span>{item.wardName} · {weekLabel(item.monthStart)}</span></div><p>{item.observation || "Sin observación escrita."}</p><small>{item.reporterName} · {dateTime(item.updatedAt)}</small></div><Badge className="organization-history-status" variant={item.approvalStatus === "approved" ? "default" : "secondary"}>{item.approvalStatus === "approved" ? "Publicado" : "Pendiente"}</Badge></article>)}</div> : <div className="mini-empty">No hay informaciones de organizaciones para este filtro.</div>}
      </section>

      <Dialog open={Boolean(detailReport)} onOpenChange={(open) => !open && setDetailReport(null)}>
        <DialogContent className="history-detail-dialog">
          {detailReport && <>
            <DialogHeader>
              <span className="section-kicker">Detalle del informe</span>
              <DialogTitle>{detailReport.wardName} · {weekLabel(detailReport.weekStart)}</DialogTitle>
              <DialogDescription>Informe enviado por {detailReport.reporterName || "Sin responsable"} · {dateTime(detailReport.updatedAt)}</DialogDescription>
            </DialogHeader>
            <div className="history-detail-grid">
              <section>
                <span>01</span><div><strong>Reunión Sacramental</strong><p>{detailReport.sacramentalObservation || "Sin observaciones."}</p><StatePill state={detailReport.punctualityState} />{detailReport.punctualityNote && <small>{detailReport.punctualityNote}</small>}</div>
              </section>
              <section>
                <span>02</span><div><strong>Consejo de Barrio</strong><p>{detailReport.wardCouncilObservation || "Sin observaciones."}</p><StatePill state={detailReport.followupState} />{detailReport.followupNote && <small>{detailReport.followupNote}</small>}</div>
              </section>
              <section>
                <span>03</span><div><strong>Obra Misional y Obra de Templo e Historia Familiar</strong><p>{detailReport.missionaryObservation || "Sin observaciones."}</p></div>
              </section>
              <section>
                <span>04</span><div><strong>Otros enfoques relevantes</strong><p>{detailReport.otherObservation || "Sin observaciones."}</p><StatePill state={detailReport.scheduleState} />{detailReport.scheduleNote && <small>{detailReport.scheduleNote}</small>}</div>
              </section>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setDetailReport(null)}>Cerrar</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminWardSummary({ data, monthStart }: { data: PortalData; monthStart: string }) {
  return (
    <section className="panel admin-panel ward-summary-panel">
      <div className="panel-heading">
        <div><span className="section-kicker">Lectura integrada · {weekLabel(monthStart)}</span><h3>Todo lo informado por barrio</h3></div>
        <Badge variant="outline">Sumo Consejo + organizaciones</Badge>
      </div>
      <div className="admin-ward-grid">
        {data.wards.map((ward) => {
          const council = data.reports.find((item) => item.wardId === ward.id && item.weekStart === monthStart);
          const organizations = data.organizationReports.filter((item) => item.wardId === ward.id && item.monthStart === monthStart && item.observation);
          const councilComments = council ? [
            ["Reunión Sacramental", council.sacramentalObservation],
            ["Consejo de Barrio", council.wardCouncilObservation],
            ["Obra Misional y Templo", council.missionaryObservation],
            ["Otros enfoques", council.otherObservation],
          ].filter(([, text]) => text) : [];
          return (
            <article key={ward.id} className="admin-ward-card">
              <div className="admin-ward-title"><Building2 /><div><span>Barrio</span><h4>{ward.name}</h4></div></div>
              {!councilComments.length && !organizations.length ? <p className="ward-summary-empty">Sin comentarios registrados este mes.</p> : <div className="ward-comment-list">
                {councilComments.map(([label, text]) => <div className="ward-comment" key={label}><strong>Sumo Consejo · {label}</strong><p>{text}</p></div>)}
                {organizations.map((item) => <div className="ward-comment organization" key={item.id}><strong>{organizationLabels[item.organization]} · {item.approvalStatus === "approved" ? "Aprobado" : "Pendiente"}</strong><p>{item.observation}</p><small>{item.reporterName} · {dateTime(item.updatedAt)}</small></div>)}
              </div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OrganizationReviewCard({ item, post, refresh }: { item: OrganizationReport; post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>; refresh: () => Promise<void> }) {
  const [observation, setObservation] = useState(item.observation);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const save = async (approvalStatus: "pending" | "approved") => {
    setBusy(true);
    setPublished(false);
    try {
      await post({ action: "review_organization_report", reportId: item.id, observation, approvalStatus });
      toast.success(approvalStatus === "approved" ? "Información aprobada y publicada" : "Cambios guardados como pendientes");
      setPublished(approvalStatus === "approved");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible revisar la información."); }
    finally { setBusy(false); }
  };
  return <article className={`review-card ${item.approvalStatus}`}>
    <div className="review-card-heading"><div><span>{item.wardName}</span><h4>{organizationLabels[item.organization]}</h4><small>{item.reporterName} · {dateTime(item.updatedAt)}</small></div><Badge variant={item.approvalStatus === "approved" ? "default" : "secondary"}>{item.approvalStatus === "approved" ? "Aprobado" : "Pendiente"}</Badge></div>
    <Textarea value={observation} maxLength={TEXT_LIMIT} onChange={(event) => { setObservation(event.target.value); setPublished(false); }} rows={4} aria-label={`Información de ${organizationLabels[item.organization]} para ${item.wardName}`} />
    <CharacterCount value={observation} />
    <div className="review-actions"><Button variant="outline" disabled={busy} onClick={() => void save("pending")}><Save /> Guardar cambios</Button><Button disabled={busy || !observation.trim()} onClick={() => void save("approved")}><CheckCircle2 /> Aprobar y publicar</Button></div>
    {published && <small className="published-confirmation"><CheckCircle2 /> ¡Publicado!</small>}
  </article>;
}

function OrganizationApprovalPanel({ data, monthStart, post, refresh }: { data: PortalData; monthStart: string; post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>; refresh: () => Promise<void> }) {
  const items = data.organizationReports.filter((item) => item.monthStart === monthStart).sort((a, b) => Number(a.approvalStatus === "approved") - Number(b.approvalStatus === "approved"));
  const pending = items.filter((item) => item.approvalStatus === "pending").length;
  return <section className="panel admin-panel approval-panel"><div className="panel-heading"><div><span className="section-kicker">Revisión previa · {weekLabel(monthStart)}</span><h3>Aprobación de informaciones</h3></div><Badge variant={pending ? "secondary" : "outline"}>{pending} pendientes</Badge></div>{items.length ? <div className="review-grid">{items.map((item) => <OrganizationReviewCard key={item.id} item={item} post={post} refresh={refresh} />)}</div> : <div className="mini-empty">No hay información de organizaciones para revisar este mes.</div>}</section>;
}

function AdminView({ data, refresh, post }: { data: PortalData; refresh: () => Promise<void>; post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>> }) {
  const [wardOpen, setWardOpen] = useState(false);
  const [wardName, setWardName] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingWard, setDeletingWard] = useState<Ward | null>(null);
  const [memberForm, setMemberForm] = useState({ displayName: "", email: "", username: "", password: "", role: "leader" as "admin" | "leader", reportScope: "high_council" as ReportScope, active: true, wardIds: [] as number[] });
  const [submitting, setSubmitting] = useState(false);

  const openMember = (member?: Member) => {
    setEditingMember(member ?? null);
    setMemberForm(member ? {
      displayName: member.displayName,
      email: member.email,
      username: member.username,
      password: "",
      role: member.role,
      reportScope: member.reportScope,
      active: member.active,
      wardIds: data.assignments.filter((item) => item.memberId === member.id).map((item) => item.wardId),
    } : { displayName: "", email: "", username: "", password: "", role: "leader", reportScope: "high_council", active: true, wardIds: [] });
    setMemberOpen(true);
  };

  const createWard = async () => {
    setSubmitting(true);
    try {
      await post({ action: "create_ward", name: wardName });
      toast.success("Barrio agregado");
      setWardName("");
      setWardOpen(false);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible guardar."); }
    finally { setSubmitting(false); }
  };

  const deleteWard = async () => {
    if (!deletingWard) return;
    setSubmitting(true);
    try {
      await post({ action: "delete_ward", wardId: deletingWard.id });
      toast.success(`Barrio ${deletingWard.name} eliminado`);
      setDeletingWard(null);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible eliminar el barrio."); }
    finally { setSubmitting(false); }
  };

  const saveMember = async () => {
    setSubmitting(true);
    try {
      await post({ action: "save_member", memberId: editingMember?.id, ...memberForm });
      toast.success(editingMember ? "Acceso actualizado" : "Acceso creado");
      setMemberOpen(false);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible guardar."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="view-stack">
      <section className="admin-heading"><div><span className="section-kicker">Configuración de cuentas</span><h2>Barrios y accesos</h2><p>Administra usuarios, perfiles y barrios asignados. Las publicaciones se revisan en Aprobaciones.</p></div><Badge variant="outline"><ShieldCheck /> Acceso de administrador</Badge></section>
      <section className="panel admin-panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Estructura</span><h3>Barrios</h3></div>
          <Dialog open={wardOpen} onOpenChange={setWardOpen}>
            <DialogTrigger asChild><Button><Plus /> Agregar barrio</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar barrio</DialogTitle><DialogDescription>El barrio aparecerá en el resumen de cada mes.</DialogDescription></DialogHeader>
              <div className="dialog-field"><label htmlFor="ward-name">Nombre del barrio</label><Input id="ward-name" value={wardName} onChange={(event) => setWardName(event.target.value)} placeholder="Ej.: Macul 2" autoFocus /></div>
              <DialogFooter><Button variant="outline" onClick={() => setWardOpen(false)}>Cancelar</Button><Button disabled={submitting} onClick={createWard}>Guardar barrio</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {data.wards.length ? <div className="ward-chips">{data.wards.map((ward) => <div key={ward.id}><Building2 /><span>{ward.name}</span><Badge variant="secondary">Activo</Badge><Button variant="ghost" size="icon" aria-label={`Eliminar ${ward.name}`} title={`Eliminar ${ward.name}`} onClick={() => setDeletingWard(ward)}><Trash2 /></Button></div>)}</div> : <div className="mini-empty">Aún no has agregado barrios.</div>}
      </section>

      <section className="panel admin-panel">
        <div className="panel-heading"><div><span className="section-kicker">Equipo</span><h3>Usuarios asignados</h3></div><Button onClick={() => openMember()}><Plus /> Nuevo acceso</Button></div>
        <div className="member-list">
          {data.members.map((member) => {
            const names = data.assignments.filter((item) => item.memberId === member.id).map((item) => data.wards.find((ward) => ward.id === item.wardId)?.name).filter(Boolean);
            return (
              <button key={member.id} className="member-row" onClick={() => openMember(member)}>
                <div className="profile-avatar">{initials(member.displayName)}</div>
                <div className="member-main"><strong>{member.displayName}</strong><span>{member.email}</span></div>
                <div className="member-wards">{member.role === "admin" ? <Badge variant="default">Administrador</Badge> : <>{member.reportScope !== "high_council" && <Badge variant="outline">{organizationLabels[member.reportScope]}</Badge>}{names.length ? names.map((name) => <Badge key={name} variant="outline">{name}</Badge>) : <Badge variant="secondary">Sin barrio asignado</Badge>}</>}</div>
                <div className="member-state"><span className={`connection-dot ${member.connected ? "connected" : ""}`} />{member.connected ? "Conectado" : "Invitado"}</div>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </section>

      <Dialog open={Boolean(deletingWard)} onOpenChange={(open) => !open && setDeletingWard(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar barrio</DialogTitle><DialogDescription>{deletingWard ? `¿Quieres eliminar ${deletingWard.name} de la Estaca? Dejará de aparecer en los paneles y se quitarán sus asignaciones de usuarios. Los informes históricos quedarán conservados en la base de datos.` : ""}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={submitting} onClick={() => setDeletingWard(null)}>Cancelar</Button><Button variant="destructive" disabled={submitting} onClick={() => void deleteWard()}><Trash2 /> {submitting ? "Eliminando…" : "Eliminar barrio"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="member-dialog">
          <DialogHeader><DialogTitle>{editingMember ? "Editar acceso" : "Nuevo acceso"}</DialogTitle><DialogDescription>El usuario ingresará con este correo y el informe quedará registrado con su nombre.</DialogDescription></DialogHeader>
          <div className="dialog-grid">
            <div className="dialog-field"><label htmlFor="member-name">Nombre completo</label><Input id="member-name" value={memberForm.displayName} onChange={(event) => setMemberForm((previous) => ({ ...previous, displayName: event.target.value }))} placeholder="Nombre del integrante" /></div>
            <div className="dialog-field"><label htmlFor="member-email">Correo de acceso</label><Input id="member-email" type="email" value={memberForm.email} onChange={(event) => setMemberForm((previous) => ({ ...previous, email: event.target.value }))} placeholder="correo@ejemplo.cl" /></div>
            <div className="dialog-field"><label htmlFor="member-username">Usuario</label><Input id="member-username" value={memberForm.username} onChange={(event) => setMemberForm((previous) => ({ ...previous, username: event.target.value }))} placeholder="ej.: juan.perez" /></div>
            <div className="dialog-field"><label htmlFor="member-password">{editingMember ? "Nueva contraseña (opcional)" : "Contraseña"}</label><Input id="member-password" type="password" value={memberForm.password} onChange={(event) => setMemberForm((previous) => ({ ...previous, password: event.target.value }))} placeholder={editingMember ? "Dejar en blanco para mantenerla" : "Mínimo 8 caracteres"} /></div>
            <div className="dialog-field"><label>Nivel de acceso</label><Select value={memberForm.role} onValueChange={(role) => setMemberForm((previous) => ({ ...previous, role: role as "admin" | "leader" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="leader">Usuario informante</SelectItem><SelectItem value="admin">Administración Estaca</SelectItem></SelectContent></Select></div>
            {memberForm.role !== "admin" && <div className="dialog-field"><label>Perfil de informe</label><Select value={memberForm.reportScope} onValueChange={(reportScope) => setMemberForm((previous) => ({ ...previous, reportScope: reportScope as ReportScope }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high_council">Sumo Consejo asignado</SelectItem><SelectItem value="relief_society">Organización · Sociedad de Socorro</SelectItem><SelectItem value="primary">Organización · Primaria</SelectItem><SelectItem value="young_women">Organización · Mujeres Jóvenes</SelectItem><SelectItem value="young_men">Organización · Hombres Jóvenes</SelectItem><SelectItem value="sunday_school">Organización · Escuela Dominical</SelectItem><SelectItem value="jas">Organización · JAS</SelectItem><SelectItem value="single_adults">Organización · AS</SelectItem><SelectItem value="temple_family_history">Organización · Templo e Historia Familiar</SelectItem><SelectItem value="missionary_work">Organización · Obra Misional</SelectItem><SelectItem value="self_reliance">Organización · Autosuficiencia</SelectItem><SelectItem value="seminary">Organización · Seminario</SelectItem></SelectContent></Select></div>}
            {memberForm.role !== "admin" && <div className="dialog-field assignment-field"><label>Barrios asignados para consultar información</label>{data.wards.length ? <div className="assignment-list">{data.wards.map((ward) => <label key={ward.id}><Checkbox checked={memberForm.wardIds.includes(ward.id)} onCheckedChange={(checked) => setMemberForm((previous) => ({ ...previous, wardIds: checked ? [...previous.wardIds, ward.id] : previous.wardIds.filter((id) => id !== ward.id) }))} /> {ward.name}</label>)}</div> : <span className="field-help">Primero debes crear al menos un barrio.</span>}</div>}
            {editingMember && <label className="active-check"><Checkbox checked={memberForm.active} onCheckedChange={(checked) => setMemberForm((previous) => ({ ...previous, active: checked === true }))} /> Acceso activo</label>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMemberOpen(false)}>Cancelar</Button><Button disabled={submitting} onClick={saveMember}>Guardar acceso</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
