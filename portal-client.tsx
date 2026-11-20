"use client";

import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileClock,
  FilePenLine,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Mail,
  NotebookPen,
  LogOut,
  Menu,
  Plus,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
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

import { councilFields, councilFieldKeys, organizationLabels, TEXT_LIMIT, type CouncilField, type OrganizationScope, type ReportScope } from "@/lib/stake-council";
import { CouncilNotesProvider, CouncilNotesView, HighlightButton, PresidencyView } from "@/app/presidency";
import { HelpView } from "@/app/portal-help";

type Ward = { id: number; name: string; active: boolean; createdAt: string };
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
type PublishedCouncilComment = {
  reportId: number;
  field: CouncilField;
  text: string;
  wardId: number;
  wardName: string;
  monthStart: string;
  reporterName: string;
  approvedAt: string;
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
  publishedCouncilComments: PublishedCouncilComment[];
  occupiedSlots: { wardId: number; monthStart: string }[];
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
  const reportEdited = useRef(false);
  const editRevision = useRef(0);
  const formScope = useRef("");
  const readRevision = useRef(0);
  const draftWrite = useRef<Promise<unknown>>(Promise.resolve());
  const [mobileNav, setMobileNav] = useState(false);
  const [openedWard, setOpenedWard] = useState<number | null>(null);

  const weekOptions = useMemo(
    () =>
      Array.from({ length: 15 }, (_, index) => moveWeek(currentWeek, 2 - index)),
    [currentWeek],
  );

  const refresh = useCallback(async () => {
    const revision = ++readRevision.current;
    try {
      setLoadError("");
      const response = await fetch("/api/portal", { cache: "no-store" });
      const payload = (await responseJson(response)) as unknown as PortalData;
      if (readRevision.current !== revision) return;
      setData(payload);
      setSelectedWardId((current) =>
        payload.wards.some((ward) => ward.id === current)
          ? current
          : (payload.wards[0]?.id ?? 0),
      );
      if (payload.currentMember.role !== "admin") {
        setActiveView((view) => (["stake", "admin", "approvals", "council-notes"].includes(view) ? "report" : view));
      } else {
        setActiveView((view) => (view === "report" ? "stake" : view));
      }
    } catch (error) {
      if (readRevision.current !== revision) return;
      if (error instanceof Error && (error as Error & { status?: number }).status === 401) {
        setAuthRequired(true);
      }
      setLoadError(error instanceof Error ? error.message : "No fue posible cargar el portal.");
    } finally {
      if (readRevision.current === revision) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeView !== "shared" && activeView !== "history") return;
    const updateReadingView = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    updateReadingView();
    const timer = window.setInterval(updateReadingView, 30000);
    document.addEventListener("visibilitychange", updateReadingView);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateReadingView);
    };
  }, [activeView, refresh]);

  useEffect(() => {
    if (!data) return;
    const scope = `${data.currentMember.id}:${selectedWardId}:${weekStart}`;
    if (formScope.current === scope && reportEdited.current) return;
    formScope.current = scope;
    editRevision.current++;
    reportEdited.current = false;
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
    if (!reportEdited.current || !data || data.currentMember.role === "admin" || !selectedWardId || data.currentMember.reportScope !== "high_council") return;
    const existing = data.reports.find((report) => report.wardId === selectedWardId && report.weekStart === weekStart);
    const comparable = { ...form, wardId: selectedWardId, weekStart, status: "draft" as const };
    const stored = existing ? {
      wardId: existing.wardId, weekStart: existing.weekStart, status: "draft" as const,
      sacramentalObservation: existing.sacramentalObservation, punctualityState: existing.punctualityState, punctualityNote: existing.punctualityNote,
      wardCouncilObservation: existing.wardCouncilObservation, followupState: existing.followupState, followupNote: existing.followupNote,
      missionaryObservation: existing.missionaryObservation, otherObservation: existing.otherObservation,
      scheduleState: existing.scheduleState, scheduleNote: existing.scheduleNote,
    } : { ...EMPTY_FORM, wardId: selectedWardId, weekStart };
    if (JSON.stringify(comparable) === JSON.stringify(stored)) return;
    const revision = editRevision.current;
    setAutoSaveState("saving");
    const timer = window.setTimeout(async () => {
      if (!reportEdited.current) return;
      try {
        draftWrite.current = draftWrite.current.catch(() => undefined).then(() =>
          post({ action: "save_report", ...form, wardId: selectedWardId, weekStart, status: "draft" }));
        await draftWrite.current;
        if (editRevision.current === revision) {
          reportEdited.current = false;
          setAutoSaveState("saved");
        }
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

  const openReport = useCallback((wardId: number, week: string) => {
    setSelectedWardId(wardId);
    setWeekStart(week);
    if (data?.currentMember.role === "admin") {
      setOpenedWard(wardId);
      setActiveView("shared");
    } else {
      setActiveView("report");
    }
    setMobileNav(false);
  }, [data?.currentMember.role]);

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
            openReport(candidate.wardId!, candidate.weekStart);
            return { opened: true, wardId: candidate.wardId, weekStart: candidate.weekStart };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [data, openReport]);

  const saveReport = async (status: "draft" | "submitted") => {
    if (!selectedWardId) return;
    reportEdited.current = false;
    setSaving(true);
    try {
      await draftWrite.current.catch(() => undefined);
      await post({ action: "save_report", ...form, wardId: selectedWardId, weekStart, status });
      toast.success(status === "submitted" ? "Informe enviado a la Estaca" : "Borrador guardado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar.");
    } finally {
      setSaving(false);
    }
  };

  const navigate = (view: string) => {
    setOpenedWard(null);
    setActiveView(view);
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
    { value: "presidency", label: isAdmin ? "Mensajes a la presidencia" : "Mensaje directo a la presidencia", icon: Mail },
    ...(isAdmin ? [{ value: "council-notes", label: "Notas para consejo de estaca", icon: NotebookPen }] : []),
    { value: "history", label: "Historial", icon: FileClock },
    { value: "help", label: "Manual de ayuda", icon: HelpCircle },
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
    presidency: { eyebrow: isAdmin ? "Administración de estaca" : "Canal privado", title: isAdmin ? "Mensajes a la presidencia" : "Mensaje directo a la presidencia" },
    "council-notes": { eyebrow: "Administración de estaca", title: "Notas para consejo de estaca" },
    help: { eyebrow: "Orientación", title: "Manual de ayuda" },
    admin: { eyebrow: "Configuración", title: "Barrios y accesos" },
  };
  const title = viewTitles[activeView] ?? viewTitles.report;

  return (
    <CouncilNotesProvider key={data.currentMember.id} isAdmin={isAdmin} month={weekStart} view={activeView}>
    <Tabs
      value={activeView}
      onValueChange={navigate}
      orientation="vertical"
      className="portal-shell"
    >
      <aside className={`portal-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-lockup">
          <StakeLogo />
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
        <header className={`portal-header${["presidency", "council-notes"].includes(activeView) ? " private-header" : ""}`}>
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
          <Button variant="ghost" size="icon" className="mobile-header-signout" onClick={() => void signOut()} aria-label="Cerrar sesión">
            <LogOut />
          </Button>
        </header>

        <main className="workspace">
          {isAdmin && (
            <TabsContent value="stake">
              <StakeSummary data={data} weekStart={weekStart} onOpenReport={openReport} />
            </TabsContent>
          )}
          {!isAdmin && <TabsContent value="report">
            {data.currentMember.reportScope === "high_council" ? <WeeklyReport
              data={data}
              weekStart={weekStart}
              selectedWardId={selectedWardId}
              setSelectedWardId={setSelectedWardId}
              form={form}
              setForm={(update) => { editRevision.current++; reportEdited.current = true; setForm(update); }}
              saving={saving}
              onSave={saveReport}
              autoSaveState={autoSaveState}
              onGoAdmin={() => setActiveView("admin")}
            /> : <OrganizationReportView data={data} monthStart={weekStart} refresh={refresh} post={post} />}
          </TabsContent>}
          <TabsContent value="history">
            <HistoryView data={data} onOpenReport={openReport} post={post} refresh={refresh} />
          </TabsContent>
          <TabsContent value="help"><HelpView isAdmin={isAdmin} scope={data.currentMember.reportScope}
            assignedWards={data.wards.filter((ward) => data.currentAssignmentWardIds.includes(ward.id)).map((ward) => ward.name)}
            navigate={navigate} /></TabsContent>
          <TabsContent value="presidency"><PresidencyView isAdmin={isAdmin} month={weekStart} /></TabsContent>
          {isAdmin && <TabsContent value="council-notes"><CouncilNotesView /></TabsContent>}
          <TabsContent value="shared"><SharedInformationView key={openedWard ?? "all"} data={data} monthStart={weekStart} initialWard={openedWard} /></TabsContent>
          {isAdmin && <TabsContent value="approvals"><ApprovalPanel data={data} monthStart={weekStart} post={post} refresh={refresh} /></TabsContent>}
          {isAdmin && (
            <TabsContent value="admin">
              <AdminView data={data} refresh={refresh} post={post} />
            </TabsContent>
          )}
        </main>

        {/* En móvil la navegación queda disponible en el menú lateral. */}
      </section>
      <Toaster position="top-right" richColors />
    </Tabs>
    </CouncilNotesProvider>
  );
}

function StakeLogo() {
  return <img className="stake-logo" src="/logo-estaca.png" width={60} height={88} alt="Estaca Ñuñoa" />;
}

function PortalLoading() {
  return (
    <div className="portal-loading">
      <StakeLogo />
      <div className="loading-line" />
      <p>Preparando el resumen mensual…</p>
    </div>
  );
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
        <div className="login-brand"><StakeLogo /><div>
          <span className="access-eyebrow">Portal privado</span>
          <h1>Informes Estaca Ñuñoa</h1>
        </div></div>
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
  onOpenReport,
}: {
  data: PortalData;
  weekStart: string;
  onOpenReport: (wardId: number, week: string) => void;
}) {
  const weeklyReports = data.reports.filter((report) => report.weekStart === weekStart);
  const reportByWard = new Map(weeklyReports.map((report) => [report.wardId, report]));
  const submitted = weeklyReports.filter((report) => report.status === "submitted");
  const pending = data.wards.length - submitted.length;
  const attention = submitted.filter(reportNeedsAttention);
  const highlights = submitted.filter((report) =>
    [report.punctualityState, report.followupState, report.scheduleState].includes("destacable"),
  );
  const progress = data.wards.length ? Math.round((submitted.length / data.wards.length) * 100) : 0;

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
                  <button key={ward.id} className="ward-status" onClick={() => onOpenReport(ward.id, weekStart)}>
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
  type DigestEntry = { ward: string; text: string; state?: ReportState; id: number; field?: CouncilField };
  type DigestSection = { title: string; icon: typeof BookOpenCheck; entries: DigestEntry[] };
  const sections: DigestSection[] = [
    {
      title: "Reunión Sacramental",
      icon: BookOpenCheck,
      entries: reports.flatMap((report) => {
        const rows: DigestEntry[] = [];
        if (report.sacramentalObservation) rows.push({ id: report.id, field: "sacramentalObservation", ward: report.wardName, text: report.sacramentalObservation });
        if (report.punctualityState !== "sin_novedad" && report.punctualityState) {
          rows.push({ id: report.id, field: report.punctualityNote ? "punctualityNote" : undefined, ward: report.wardName, text: report.punctualityNote || "Puntualidad informada sin comentario.", state: report.punctualityState });
        }
        return rows;
      }),
    },
    {
      title: "Consejo de Barrio",
      icon: Users,
      entries: reports.flatMap((report) => {
        const rows: DigestEntry[] = [];
        if (report.wardCouncilObservation) rows.push({ id: report.id, field: "wardCouncilObservation", ward: report.wardName, text: report.wardCouncilObservation });
        if (report.followupState !== "sin_novedad" && report.followupState) {
          rows.push({ id: report.id, field: report.followupNote ? "followupNote" : undefined, ward: report.wardName, text: report.followupNote || "Seguimiento informado sin comentario.", state: report.followupState });
        }
        return rows;
      }),
    },
    {
      title: "Obra Misional y Templo",
      icon: Gauge,
      entries: reports
        .filter((report) => report.missionaryObservation)
        .map((report) => ({ id: report.id, field: "missionaryObservation", ward: report.wardName, text: report.missionaryObservation })),
    },
    {
      title: "Otros enfoques",
      icon: Sparkles,
      entries: reports.flatMap((report) => {
        const rows: DigestEntry[] = [];
        if (report.otherObservation) rows.push({ id: report.id, field: "otherObservation", ward: report.wardName, text: report.otherObservation });
        if (report.scheduleState !== "sin_novedad" && report.scheduleState) {
          rows.push({ id: report.id, field: report.scheduleNote ? "scheduleNote" : undefined, ward: report.wardName, text: report.scheduleNote || "Horario dominical informado sin comentario.", state: report.scheduleState });
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
          <h3>Resumen del mes</h3>
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
                      {entry.field && <HighlightButton source={{ type: "high_council", id: entry.id, field: entry.field }} text={entry.text} />}
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
  const occupied = data.occupiedSlots.some((slot) => slot.wardId === selectedWardId && slot.monthStart === weekStart);
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
          <p>{occupied ? "Otro informante ya registró el informe de este barrio y mes." : "Al enviar, Administración podrá revisar y publicar cada comentario por separado."}</p>
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
          ) : <Badge variant="outline">{occupied ? "Registrado" : "Nuevo informe"}</Badge>}
        </div>
      </section>

      {occupied ? <p className="panel mini-empty">Los comentarios que publique Administración estarán en Consulta de informes.</p> : <>
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
      </>}
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
  const [saveStates, setSaveStates] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [expandedWard, setExpandedWard] = useState<{ key: string; wardId: number | null } | null>(null);
  const timers = useRef<Record<string, number>>({});
  const versions = useRef<Record<string, number>>({});
  const locallyEdited = useRef<Set<string>>(new Set());
  const latestDrafts = useRef<Record<string, string>>({});
  const saveQueues = useRef<Record<string, Promise<void>>>({});
  const scopeKey = `${monthStart}:${organization}`;

  // El primer barrio aparece abierto al cambiar de mes u organización.
  const expandedWardId = expandedWard?.key === scopeKey
    ? expandedWard.wardId
    : (data.wards[0]?.id ?? null);

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const ward of data.wards) {
      const key = `${scopeKey}:${ward.id}`;
      const persisted = data.organizationReports.find((item) =>
        item.wardId === ward.id &&
        item.monthStart === monthStart &&
        item.organization === organization
      )?.observation ?? "";
      // Una actualización de otros barrios no debe borrar texto aún no guardado.
      next[ward.id] = locallyEdited.current.has(key)
        ? (latestDrafts.current[key] ?? persisted)
        : persisted;
      latestDrafts.current[key] = next[ward.id];
    }
    setDrafts(next);
  }, [data, monthStart, organization, scopeKey]);

  const updateObservation = (wardId: number, observation: string) => {
    const key = `${scopeKey}:${wardId}`;
    latestDrafts.current[key] = observation;
    locallyEdited.current.add(key);
    const revision = (versions.current[key] ?? 0) + 1;
    versions.current[key] = revision;
    setDrafts((current) => ({ ...current, [wardId]: observation }));
    setSaveStates((current) => ({ ...current, [key]: "saving" }));

    if (timers.current[key]) window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => {
      // Serializa cambios del mismo barrio para impedir que un envío antiguo
      // sobrescriba uno más reciente si la conexión es lenta.
      const previous = saveQueues.current[key] ?? Promise.resolve();
      const pending = previous.catch(() => undefined).then(async () => {
        try {
          await post({
            action: "save_organization_report",
            wardId,
            monthStart,
            organization,
            observation,
          });
          if (versions.current[key] === revision) {
            locallyEdited.current.delete(key);
            setSaveStates((current) => ({ ...current, [key]: "saved" }));
          }
          await refresh();
        } catch (error) {
          if (versions.current[key] === revision) {
            setSaveStates((current) => ({ ...current, [key]: "error" }));
          }
          toast.error(error instanceof Error ? error.message : "No fue posible guardar automáticamente.");
        }
      });
      saveQueues.current[key] = pending;
    }, 900);
  };

  return (
    <div className="view-stack organization-view">
      <style>{`
        .organization-card .organization-mobile-toggle { display: none; }
        .organization-card .organization-card-body > label {
          display: block;
          margin: 17px 0 8px;
          color: var(--secondary-foreground);
          font-size: 12px;
          font-weight: 700;
        }
        @media (max-width: 760px) {
          .organization-card.organization-tone-empty {
            border-color: #d9e2e2;
            background: #f5f7f7;
          }
          .organization-card.organization-tone-saving {
            border-color: #edd38e;
            background: #fff8e7;
          }
          .organization-card.organization-tone-saved {
            border-color: #add8bd;
            background: #eaf7ef;
          }
          .organization-card .organization-desktop-heading { display: none; }
          .organization-card .organization-mobile-toggle {
            display: flex;
            width: 100%;
            min-height: 86px;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 0;
            color: inherit;
            border: 0;
            background: transparent;
            text-align: left;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }
          .organization-card .organization-mobile-toggle:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 4px;
            border-radius: 8px;
          }
          .organization-card .organization-mobile-title {
            display: flex;
            min-width: 0;
            flex-direction: column;
            align-items: flex-start;
          }
          .organization-card .organization-mobile-title strong {
            margin-top: 6px;
            color: var(--foreground);
            font-size: 21px;
            font-weight: 650;
            line-height: 1.2;
          }
          .organization-card .organization-mobile-title .autosave-indicator {
            margin-top: 11px;
            max-width: 100%;
            border: 1px solid #d8e1e1;
            background: #e9eeee;
            color: #667b7d;
            font-size: 12px;
          }
          .organization-card.organization-tone-saving .organization-mobile-title .autosave-indicator {
            border-color: #e9d59d;
            background: #ffefc4;
            color: #81601d;
          }
          .organization-card.organization-tone-saved .organization-mobile-title .autosave-indicator {
            border-color: #b6dec4;
            background: #d7f0df;
            color: #247347;
          }
          .organization-card .organization-mobile-chevron {
            width: 22px;
            height: 22px;
            flex: 0 0 22px;
            color: #648b8b;
            transition: transform .2s ease;
          }
          .organization-card .organization-mobile-chevron.is-expanded {
            transform: rotate(180deg);
          }
          .organization-card .organization-card-body.is-collapsed { display: none; }
          .organization-card .organization-card-body:not(.is-collapsed) {
            margin-top: 15px;
            padding-top: 16px;
            border-top: 1px solid rgba(80,120,115,.20);
          }
          .organization-card .organization-card-body > label {
            margin-top: 0;
            font-size: 14px;
          }
          .organization-card .organization-card-body textarea {
            background: #fff;
            font-size: 16px;
          }
          .organization-card .organization-approval-note {
            margin-top: 7px;
            font-size: 11px;
            color: #637d7b;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .organization-card .organization-mobile-chevron { transition: none; }
        }
      `}</style>
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
          const existing = data.organizationReports.find((item) =>
            item.wardId === ward.id && item.monthStart === monthStart && item.organization === organization
          );
          const occupied = data.occupiedSlots.some((slot) => slot.wardId === ward.id && slot.monthStart === monthStart);
          const key = `${scopeKey}:${ward.id}`;
          const observation = locallyEdited.current.has(key)
            ? (latestDrafts.current[key] ?? drafts[ward.id] ?? "")
            : (drafts[ward.id] ?? existing?.observation ?? "");
          const state = saveStates[key];
          const hasComments = observation.trim().length > 0;
          const isBusy = state === "saving" || state === "error";
          const tone = isBusy ? "saving" : hasComments ? "saved" : "empty";
          const stateLabel = occupied ? "En revisión" : state === "saving"
            ? "Guardando cambios…"
            : state === "error"
              ? "No se pudo guardar"
              : hasComments
                ? "Cambios guardados"
                : "Sin comentarios";
          const expanded = expandedWardId === ward.id;
          return (
            <article className={`panel organization-card organization-tone-${tone}`} key={ward.id}>
              {/* Vista de escritorio: los informes permanecen abiertos. */}
              <div className="organization-card-heading organization-desktop-heading">
                <div><span className="section-kicker">Barrio</span><h3>{ward.name}</h3></div>
                <span className={`autosave-indicator ${tone}`}>{stateLabel}</span>
              </div>
              {/* Vista móvil: un solo barrio abierto, con semáforo visible incluso cerrado. */}
              <button
                type="button"
                className="organization-mobile-toggle"
                aria-expanded={expanded}
                aria-controls={`organization-panel-${ward.id}`}
                onClick={() => setExpandedWard({ key: scopeKey, wardId: expanded ? null : ward.id })}
              >
                <span className="organization-mobile-title">
                  <span className="section-kicker">Barrio</span>
                  <strong>{ward.name}</strong>
                  <span className={`autosave-indicator ${tone}`} aria-live="polite">{stateLabel}</span>
                  {hasComments && existing?.approvalStatus === "approved" &&
                    <span className="organization-approval-note">Aprobado por Estaca</span>}
                </span>
                <ChevronDown className={`organization-mobile-chevron ${expanded ? "is-expanded" : ""}`} aria-hidden="true" />
              </button>
              <div
                id={`organization-panel-${ward.id}`}
                className={`organization-card-body ${expanded ? "" : "is-collapsed"}`}
              >
                {occupied ? <p className="ward-summary-empty">Otro informante de tu organización tiene un aporte pendiente para este barrio y mes.</p> : <>
                <label htmlFor={`organization-${ward.id}`}>Observación del mes</label>
                <Textarea
                  id={`organization-${ward.id}`}
                  value={observation}
                  maxLength={TEXT_LIMIT}
                  onChange={(event) => updateObservation(ward.id, event.target.value)}
                  placeholder={`Escribe lo observado por ${organizationLabels[organization]} en ${ward.name}…`}
                  rows={5}
                  autoComplete="off"
                />
                <CharacterCount value={observation} />
                {hasComments && !isBusy && <small className="organization-approval-note">{existing?.approvalStatus === "approved" ? "Publicado por Administración" : "Pendiente de aprobación"}</small>}
                </>}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function SharedInformationView({ data, monthStart, initialWard }: { data: PortalData; monthStart: string; initialWard: number | null }) {
  const isAdmin = data.currentMember.role === "admin";
  const isHighCouncil = data.currentMember.reportScope === "high_council";
  const [wardFilter, setWardFilter] = useState(initialWard ? String(initialWard) : "all");
  const [sourceFilter, setSourceFilter] = useState("all");
  // The API already scopes the ward list to the signed-in profile.
  const selectedWards = data.wards.filter((ward) => wardFilter === "all" || ward.id === Number(wardFilter));
  const visibleOrganizations = data.organizationReports.filter((item) =>
    item.monthStart === monthStart && (isAdmin || item.approvalStatus === "approved"));
  const availableOrganizations = Array.from(new Set(visibleOrganizations.map((item) => item.organization)));
  const includeCouncil = sourceFilter === "all" || sourceFilter === "high_council";
  const published = data.publishedCouncilComments.filter((item) => item.monthStart === monthStart);
  const publishedKeys = new Set(published.map((item) => `${item.reportId}-${item.field}`));
  const councilComments = !includeCouncil ? [] : isAdmin
    ? data.reports.filter((report) => report.weekStart === monthStart).flatMap((report) =>
        councilFieldKeys.filter((field) => report[field].trim()).map((field) => ({
          reportId: report.id, field, text: report[field], wardId: report.wardId, reporterName: report.reporterName,
          date: report.updatedAt, submitted: report.status === "submitted",
          status: publishedKeys.has(`${report.id}-${field}`)
            ? "Publicado" : report.status === "submitted" ? "Pendiente" : "Borrador",
        })))
    : published.map((item) => ({ ...item, date: item.approvedAt, submitted: true, status: "Publicado" }));
  const organizationRows = visibleOrganizations.filter((item) => sourceFilter === "all" || item.organization === sourceFilter);
  const count = [...councilComments, ...organizationRows].filter((item) =>
    wardFilter === "all" || item.wardId === Number(wardFilter)).length;
  return (
    <div className="view-stack shared-view">
      <section className="history-heading">
        <div><span className="section-kicker">Vista consolidada · {weekLabel(monthStart)}</span><h2>Informes por barrio</h2><p>{isAdmin ? "Consulta toda la información de la Estaca por barrio y origen." : isHighCouncil ? "Lee los comentarios publicados del Sumo Consejo y de todas las organizaciones en tus barrios asignados." : "Lee los comentarios publicados del Sumo Consejo y de todas las organizaciones en los barrios de la estaca."}</p></div>
        <Badge variant="outline"><ShieldCheck /> {count} {count === 1 ? "comentario" : "comentarios"}</Badge>
      </section>
      <section className="panel report-browser-controls">
        <div><label>Barrio</label><Select value={wardFilter} onValueChange={setWardFilter}><SelectTrigger aria-label="Filtrar por barrio"><Building2 /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los barrios</SelectItem>{data.wards.map((ward) => <SelectItem key={ward.id} value={String(ward.id)}>{ward.name}</SelectItem>)}</SelectContent></Select></div>
        <div><label>Tipo de información</label><Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger aria-label="Filtrar por origen"><BookOpenCheck /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda la información</SelectItem><SelectItem value="high_council">Sumo Consejo</SelectItem>{availableOrganizations.map((organization) => <SelectItem key={organization} value={organization}>{organizationLabels[organization]}</SelectItem>)}</SelectContent></Select></div>
      </section>
      {data.wards.length === 0 ? <section className="panel digest-empty"><Building2 /><p>{isHighCouncil && !isAdmin ? "Aún no tienes barrios asignados para consultar." : "Aún no hay barrios disponibles."}</p></section> : (
        <section className="shared-information-grid">
          {selectedWards.map((ward) => {
            const wardId = ward.id;
            const organizations = organizationRows.filter((item) => item.wardId === wardId);
            const comments = councilComments.filter((item) => item.wardId === wardId);
            const hasContent = Boolean(organizations.length || comments.length);
            return <article className="panel shared-ward-card" key={wardId}>
              <div className="admin-ward-title"><Building2 /><div><span>Barrio</span><h3>{ward?.name ?? "Barrio"}</h3></div></div>
              {hasContent ? <div className="ward-comment-list">
                {comments.map((item) => <div className="ward-comment" key={`${item.reportId}-${item.field}`}>
                  <strong>Sumo Consejo · {councilFields[item.field]}{isAdmin && ` · ${item.status}`}</strong><p>{item.text}</p>
                  <small>{item.reporterName} · {dateTime(item.date)}</small>
                  {isAdmin && item.submitted && <HighlightButton source={{ type: "high_council", id: item.reportId, field: item.field }} text={item.text} />}
                </div>)}
                {organizations.map((item) => <div className="ward-comment organization" key={item.id}>
                  <strong>{organizationLabels[item.organization]}{isAdmin && item.approvalStatus !== "approved" ? " · Pendiente" : ""}</strong>
                  <p>{item.observation}</p><small>{item.reporterName} · {dateTime(item.updatedAt)}</small>
                  {isAdmin && <HighlightButton source={{ type: "organization", id: item.id, field: "observation" }} text={item.observation} />}
                </div>)}
              </div> : <p className="ward-summary-empty">No hay información disponible para este mes y filtro.</p>}
            </article>;
          })}
        </section>
      )}
    </div>
  );
}

function HistoryView({ data, onOpenReport, post, refresh }: { data: PortalData; onOpenReport: (wardId: number, week: string) => void; post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>; refresh: () => Promise<void> }) {
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const showCouncilReports = data.currentMember.role === "admin" || data.currentMember.reportScope === "high_council";
  const filtered = data.reports.filter(
    (report) =>
      (wardFilter === "all" || report.wardId === Number(wardFilter)) &&
      (statusFilter === "all" || report.status === statusFilter),
  );
  const councilHistory = data.publishedCouncilComments.filter((item) => wardFilter === "all" || item.wardId === Number(wardFilter));
  const organizationHistory = data.organizationReports.filter((report) => wardFilter === "all" || report.wardId === Number(wardFilter));
  const removeReport = async (reportId: number, reportType: "high_council" | "organization") => {
    if (!window.confirm("¿Eliminar definitivamente este informe y su texto? Esta acción no se puede deshacer.")) return;
    try {
      await post({ action: "delete_report", reportId, reportType });
      toast.success("Informe eliminado");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible eliminar el informe."); }
  };
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
                  <TableCell className="text-right"><div className="history-row-actions"><Button variant="ghost" size="sm" onClick={() => onOpenReport(report.wardId, report.weekStart)}>Abrir <ArrowRight /></Button>{data.currentMember.role === "admin" && <Button variant="ghost" size="icon" className="danger-action" aria-label={`Eliminar informe de ${report.wardName}`} onClick={() => void removeReport(report.id, "high_council")}><Trash2 /></Button>}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <div className="digest-empty"><FileClock /><p>No hay informes que coincidan con los filtros.</p></div>}
      </section>}
      {data.currentMember.role !== "admin" && <section className="panel organization-history-panel">
        <div className="panel-heading"><div><span className="section-kicker">Sumo Consejo</span><h3>Comentarios publicados</h3></div><Badge variant="outline">{councilHistory.length}</Badge></div>
        {councilHistory.length ? <div className="organization-history-list">{councilHistory.map((item) => (
          <article key={`${item.reportId}-${item.field}`}><div><strong>{councilFields[item.field]}</strong><span>{item.wardName} · {weekLabel(item.monthStart)}</span></div>
            <p>{item.text}</p><small>{item.reporterName} · {dateTime(item.approvedAt)}</small></article>
        ))}</div> : <div className="mini-empty">Aún no hay comentarios publicados del Sumo Consejo para este filtro.</div>}
      </section>}
      <section className="panel organization-history-panel">
        <div className="panel-heading"><div><span className="section-kicker">Organizaciones</span><h3>Historial de informaciones</h3></div><Badge variant="outline">{organizationHistory.length} registros</Badge></div>
        {organizationHistory.length ? <div className="organization-history-list">{organizationHistory.map((item) => <article key={item.id}><div><strong>{organizationLabels[item.organization]}</strong><span>{item.wardName} · {weekLabel(item.monthStart)}</span></div><div className="history-org-actions"><Badge variant={item.approvalStatus === "approved" ? "default" : "secondary"}>{item.approvalStatus === "approved" ? "Publicado" : "Pendiente"}</Badge>{data.currentMember.role === "admin" && <Button variant="ghost" size="icon" className="danger-action" aria-label={`Eliminar información de ${item.wardName}`} onClick={() => void removeReport(item.id, "organization")}><Trash2 /></Button>}</div><p>{item.observation || "Sin observación escrita."}</p><small>{item.reporterName} · {dateTime(item.updatedAt)}</small></article>)}</div> : <div className="mini-empty">No hay informaciones de organizaciones para este filtro.</div>}
      </section>
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
  const save = async (approvalStatus: "pending" | "approved") => {
    setBusy(true);
    try {
      await post({ action: "review_organization_report", reportId: item.id, observation, approvalStatus, previousObservation: item.observation, previousStatus: item.approvalStatus });
      toast.success(approvalStatus === "approved" ? "Información aprobada y publicada" : "Cambios guardados como pendientes");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible revisar la información.");
      if ((error as { status?: number }).status === 409) await refresh();
    }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("¿Eliminar definitivamente esta información? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    try {
      await post({ action: "delete_report", reportId: item.id, reportType: "organization" });
      toast.success("Información eliminada");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible eliminar."); }
    finally { setBusy(false); }
  };
  return <article className={`review-card ${item.approvalStatus}`}>
    <div className="review-card-heading"><div><span>{item.wardName}</span><h4>{organizationLabels[item.organization]}</h4><small>{item.reporterName} · {dateTime(item.updatedAt)}</small></div><Badge variant={item.approvalStatus === "approved" ? "default" : "secondary"}>{item.approvalStatus === "approved" ? "Publicado" : "Pendiente"}</Badge></div>
    <Textarea value={observation} maxLength={TEXT_LIMIT} onChange={(event) => setObservation(event.target.value)} rows={4} aria-label={`Información de ${organizationLabels[item.organization]} para ${item.wardName}`} />
    <CharacterCount value={observation} />
    {item.observation.trim() && <div className="review-highlight">
      <HighlightButton source={{ type: "organization", id: item.id, field: "observation" }} text={item.observation}
        disabled={busy || observation !== item.observation} />
      {observation !== item.observation && <small>Guarda tus cambios para destacar la versión editada.</small>}
    </div>}
    <div className="review-actions"><Button variant="ghost" className="danger-action" disabled={busy} onClick={() => void remove()}><Trash2 /> Eliminar</Button><Button variant="outline" disabled={busy} onClick={() => void save("pending")}><Save /> {item.approvalStatus === "approved" ? "Retirar publicación" : "Guardar cambios"}</Button><Button disabled={busy || !observation.trim() || (item.approvalStatus === "approved" && observation === item.observation)} onClick={() => void save("approved")}><CheckCircle2 /> Aprobar y publicar</Button></div>
  </article>;
}

type ReviewActions = {
  post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  refresh: () => Promise<void>;
};

function CouncilReviewCard({ report, field, published, post, refresh }: ReviewActions & {
  report: Report; field: CouncilField; published: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const text = report[field];
  const review = async () => {
    setBusy(true);
    try {
      await post({ action: "review_council_comment", reportId: report.id, field, text, decision: published ? "withdraw" : "publish" });
      toast.success(published ? "Publicación retirada" : "Comentario aprobado y publicado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible revisar el comentario.");
      if ((error as { status?: number }).status === 409) await refresh();
    } finally { setBusy(false); }
  };
  return <article className={`review-card ${published ? "approved" : "pending"}`}>
    <div className="review-card-heading"><div><span>{report.wardName} · Sumo Consejo</span>
      <h4>{councilFields[field]}</h4><small>{report.reporterName} · {dateTime(report.updatedAt)}</small></div>
      <Badge variant={published ? "default" : "secondary"}>{published ? "Publicado" : "Pendiente"}</Badge></div>
    <p className="review-comment-text">{text}</p>
    <div className="review-highlight">
      {report.status === "submitted" && <HighlightButton source={{ type: "high_council", id: report.id, field }} text={text} disabled={busy} />}
      <Button variant={published ? "outline" : "default"} onClick={() => void review()} disabled={busy}>
        <CheckCircle2 />{published ? "Retirar publicación" : "Aprobar y publicar"}
      </Button>
    </div>
  </article>;
}

function ApprovalPanel({ data, monthStart, post, refresh }: ReviewActions & { data: PortalData; monthStart: string }) {
  const organizations = data.organizationReports.filter((item) => item.monthStart === monthStart)
    .sort((a, b) => Number(a.approvalStatus === "approved") - Number(b.approvalStatus === "approved"));
  const published = new Set(data.publishedCouncilComments.filter((item) => item.monthStart === monthStart)
    .map((item) => `${item.reportId}-${item.field}`));
  const comments = data.reports.filter((report) => report.weekStart === monthStart).flatMap((report) =>
    councilFieldKeys.filter((field) => report[field].trim()).map((field) => ({
      report, field, published: published.has(`${report.id}-${field}`),
    })).filter((item) => item.published || report.status === "submitted"))
    .sort((a, b) => Number(a.published) - Number(b.published));
  return <div className="view-stack">
    <section className="panel admin-panel approval-panel">
      <div className="panel-heading"><div><span className="section-kicker">{weekLabel(monthStart)}</span><h3>Comentarios del Sumo Consejo</h3>
        <p>Aprueba cada comentario por separado para compartirlo con las organizaciones de la estaca y los sumos asignados al barrio.</p></div>
        <Badge variant="outline">{comments.filter((item) => !item.published).length} pendientes</Badge></div>
      {comments.length ? <div className="review-grid">{comments.map(({ report, field, published }) =>
        <CouncilReviewCard key={`${report.id}-${field}`} report={report} field={field} published={published} post={post} refresh={refresh} />)}</div>
        : <div className="mini-empty">Aún no hay comentarios enviados por el Sumo Consejo para este mes.</div>}
    </section>
    <section className="panel admin-panel approval-panel">
      <div className="panel-heading"><div><span className="section-kicker">{weekLabel(monthStart)}</span><h3>Aportes de organizaciones</h3></div>
        <Badge variant="outline">{organizations.filter((item) => item.approvalStatus === "pending").length} pendientes</Badge></div>
      {organizations.length ? <div className="review-grid">{organizations.map((item) =>
        <OrganizationReviewCard key={`${item.id}-${item.updatedAt}`} item={item} post={post} refresh={refresh} />)}</div>
        : <div className="mini-empty">Aún no hay aportes de organizaciones para este mes.</div>}
    </section>
  </div>;
}

function AdminView({ data, refresh, post }: { data: PortalData; refresh: () => Promise<void>; post: (payload: Record<string, unknown>) => Promise<Record<string, unknown>> }) {
  const [wardOpen, setWardOpen] = useState(false);
  const [wardName, setWardName] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
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

  const removeWard = async (ward: Ward) => {
    if (!window.confirm(`¿Eliminar el barrio ${ward.name}? También se eliminarán sus asignaciones e informes. Esta acción no se puede deshacer.`)) return;
    setSubmitting(true);
    try {
      await post({ action: "delete_ward", wardId: ward.id });
      toast.success("Barrio eliminado");
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
        {data.wards.length ? <div className="ward-chips">{data.wards.map((ward) => <div key={ward.id}><Building2 /><span>{ward.name}</span><Badge variant="secondary">Activo</Badge><Button variant="ghost" size="icon" className="danger-action ward-delete" disabled={submitting} aria-label={`Eliminar barrio ${ward.name}`} onClick={() => void removeWard(ward)}><Trash2 /></Button></div>)}</div> : <div className="mini-empty">Aún no has agregado barrios.</div>}
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
            {memberForm.role !== "admin" && <div className="dialog-field assignment-field"><label>{memberForm.reportScope === "high_council" ? "Barrios asignados para informar y consultar" : "Barrios de referencia"}</label>{memberForm.reportScope !== "high_council" && <span className="field-help">Las organizaciones pueden consultar las publicaciones de todos los barrios de la estaca.</span>}{data.wards.length ? <div className="assignment-list">{data.wards.map((ward) => <label key={ward.id}><Checkbox checked={memberForm.wardIds.includes(ward.id)} onCheckedChange={(checked) => setMemberForm((previous) => ({ ...previous, wardIds: checked ? [...previous.wardIds, ward.id] : previous.wardIds.filter((id) => id !== ward.id) }))} /> {ward.name}</label>)}</div> : <span className="field-help">Primero debes crear al menos un barrio.</span>}</div>}
            {editingMember && <label className="active-check"><Checkbox checked={memberForm.active} onCheckedChange={(checked) => setMemberForm((previous) => ({ ...previous, active: checked === true }))} /> Acceso activo</label>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMemberOpen(false)}>Cancelar</Button><Button disabled={submitting} onClick={saveMember}>Guardar acceso</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
