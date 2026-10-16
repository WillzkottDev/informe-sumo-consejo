#!/usr/bin/env python3
"""Genera un archivo completo app/portal-client.tsx con acordeones y colores de guardado.

Conserva el resto del archivo tal como está en la rama seleccionada.
"""
from __future__ import annotations
import argparse
import hashlib
import sys
import urllib.error
import urllib.request
from pathlib import Path

SOURCE_URL = "https://raw.githubusercontent.com/WillzkottDev/informe-sumo-consejo/main/app/portal-client.tsx"
OUTPUT_REL = Path("LISTO_PARA_GITHUB/app/portal-client.tsx")
START_MARKER = "function OrganizationReportView("
END_MARKER = "function SharedInformationView("

NEW_VIEW = r'''function OrganizationReportView({
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
          color: #496467;
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
            outline: 2px solid #176b73;
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
            color: #234e52;
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
          const key = `${scopeKey}:${ward.id}`;
          const observation = locallyEdited.current.has(key)
            ? (latestDrafts.current[key] ?? drafts[ward.id] ?? "")
            : (drafts[ward.id] ?? existing?.observation ?? "");
          const state = saveStates[key];
          const hasComments = observation.trim().length > 0;
          const isBusy = state === "saving" || state === "error";
          const tone = isBusy ? "saving" : hasComments ? "saved" : "empty";
          const stateLabel = state === "saving"
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
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

'''


def transform(source: str) -> str:
    start = source.find(START_MARKER)
    end = source.find(END_MARKER, start + len(START_MARKER))
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("No se localizó el componente OrganizationReportView original.")
    old = source[start:end]
    if 'save_organization_report' not in old or 'data.organizationReports' not in old:
        raise RuntimeError("El componente cambió demasiado; se detuvo para evitar reemplazar una vista diferente.")
    if '  ChevronDown,\n' not in source:
        pair = '  CheckCircle2,\n  ChevronRight,'
        if source.count(pair) != 1:
            raise RuntimeError("No se pudo ubicar el import de íconos para el acordeón.")
        source = source.replace(pair, '  CheckCircle2,\n  ChevronDown,\n  ChevronRight,', 1)
        # La inserción de un import no modifica la posición de búsqueda del componente.
        start = source.find(START_MARKER)
        end = source.find(END_MARKER, start)
    result = source[:start] + NEW_VIEW + source[end:]
    if '  ChevronDown,\n' not in result or 'organization-tone-saving' not in result:
        raise RuntimeError("Falló la verificación del semáforo de guardado.")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el portal-client.tsx completo listo para GitHub.")
    parser.add_argument("--origen", type=Path, default=None,
                        help="Usa la copia de tu repositorio en lugar de descargarla de GitHub")
    args = parser.parse_args()
    if args.origen:
        source = args.origen.read_text(encoding="utf-8")
        location = str(args.origen)
    else:
        print("Descargando versión actual de GitHub...")
        try:
            req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "InformeEstaca-MobileStatus/1.0"})
            with urllib.request.urlopen(req, timeout=30) as response:
                source = response.read().decode("utf-8")
        except (urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError("No se pudo descargar GitHub. Usa --origen RUTA\\app\\portal-client.tsx.") from exc
        location = SOURCE_URL

    target = transform(source)
    output = Path(__file__).resolve().parent / OUTPUT_REL
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(target, encoding="utf-8")
    print("\nOK - ARCHIVO COMPLETO LISTO PARA REEMPLAZAR")
    print(f"Origen: {location}")
    print(f"Destino: {output}")
    print(f"Origen SHA256: {hashlib.sha256(source.encode()).hexdigest()}")
    print(f"Archivo destino: {len(target.encode()):,} bytes")
    print("Sube LISTO_PARA_GITHUB/app/portal-client.tsx a la carpeta app de GitHub.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
