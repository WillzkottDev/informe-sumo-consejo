"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, Inbox, LockKeyhole, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { messageTopics, scopeLabel, TEXT_LIMIT, type CouncilNote, type MessageTopic, type NoteSource, type PresidencyMessage } from "@/lib/stake-council";

const endpoint = "/api/presidencia";

async function jsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const detail = data && typeof data === "object" && "error" in data ? data.error : null;
    throw Object.assign(new Error(typeof detail === "string" ? detail : "No se pudo completar la solicitud."), { status: response.status });
  }
  return data as T;
}

async function write<T>(payload: Record<string, unknown>) {
  return jsonResponse<T>(await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }));
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Comprueba la conexión e inténtalo nuevamente.";
}

function usePrivateList<T>(view: "messages" | "notes", month: string, enabled: boolean, activeView: string) {
  const url = `${endpoint}?view=${view}&month=${encodeURIComponent(month)}`;
  const [state, setState] = useState<{ url: string; rows: T[]; error: string }>({ url: "", rows: [], error: "" });
  const version = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const lastAttempt = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const revision = ++version.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    lastAttempt.current = Date.now();
    try {
      const { rows } = await jsonResponse<{ rows: T[] }>(await fetch(url, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }));
      if (revision === version.current) setState({ url, rows, error: "" });
    } catch (error) {
      if (revision === version.current) {
        const unauthorized = [401, 403].includes((error as { status?: number })?.status ?? 0);
        setState(previous => ({ url, rows: !unauthorized && previous.url === url ? previous.rows : [], error: messageOf(error) }));
      }
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }, [enabled, url]);
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const whenVisible = () => { if (document.visibilityState === "visible" && !pending.current && Date.now() - lastAttempt.current >= 300000) void refresh(); };
    window.addEventListener("focus", whenVisible);
    document.addEventListener("visibilitychange", whenVisible);
    const timer = window.setInterval(whenVisible, 300000);
    return () => {
      version.current++;
      pending.current?.abort();
      pending.current = null;
      window.clearInterval(timer);
      window.removeEventListener("focus", whenVisible);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [refresh, enabled, activeView]);
  return { rows: state.url === url ? state.rows : [], error: state.url === url ? state.error : "", loading: state.url !== url, refresh };
}

type NotesState = ReturnType<typeof usePrivateList<CouncilNote>>;
const NotesContext = createContext<NotesState | null>(null);

export function CouncilNotesProvider({ isAdmin, month, view, children }: {
  isAdmin: boolean; month: string; view: string; children: ReactNode;
}) {
  const enabled = isAdmin && ["stake", "shared", "approvals", "presidency", "council-notes"].includes(view);
  const state = usePrivateList<CouncilNote>("notes", month, enabled, view);
  return <NotesContext.Provider value={isAdmin ? state : null}>{children}</NotesContext.Provider>;
}

function LoadError({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return <div className="private-load-error" role="alert"><span>{message}</span>
    <Button variant="outline" size="sm" onClick={() => void retry()}><RefreshCw /> Reintentar</Button></div>;
}

export function HighlightButton({ source, text, disabled = false }: { source: NoteSource; text: string; disabled?: boolean }) {
  const notes = useContext(NotesContext);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!notes || !text.trim()) return null;

  const matches = notes.rows.filter((item) => item.sourceType === source.type && item.sourceId === source.id && item.sourceField === source.field);
  const excerpt = (selection || draft).trim();
  const valid = !!excerpt && text.replace(/\r\n?/g, "\n").includes(excerpt.replace(/\r\n?/g, "\n"));
  const duplicate = matches.some((item) => item.excerpt === excerpt);
  const save = async () => {
    if (!valid || duplicate || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await write<{ created: boolean }>({ action: "highlight", sourceType: source.type, sourceId: source.id, sourceField: source.field, excerpt });
      await notes.refresh();
      toast.success(result.created ? "Nota guardada para el consejo de estaca." : "Esta nota ya estaba en el consejo.");
      setOpen(false);
    } catch (failed) { setError(messageOf(failed)); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(next) => {
    if (busy) return;
    if (next) { setDraft(text); setSelection(""); setError(""); }
    setOpen(next);
  }}>
    <DialogTrigger asChild>
      <Button type="button" size="sm" variant="outline" className="highlight-action" disabled={disabled}>
        {matches.length ? <BookmarkCheck /> : <Bookmark />}
        {matches.length ? `Destacado (${matches.length})` : "Destacar"}
      </Button>
    </DialogTrigger>
    <DialogContent className="private-dialog">
      <DialogHeader><DialogTitle>Destacar para el consejo</DialogTitle>
        <DialogDescription>Selecciona una frase o deja el comentario completo. La nota será visible para todos los administradores de estaca.</DialogDescription>
      </DialogHeader>
      <label className="private-field">Texto para el consejo
        <Textarea value={draft} rows={6} maxLength={TEXT_LIMIT} disabled={busy}
          onChange={(event) => { setDraft(event.target.value); setSelection(""); setError(""); }}
          onSelect={(event) => {
            const input = event.currentTarget;
            setSelection(input.value.slice(input.selectionStart, input.selectionEnd));
          }} />
      </label>
      {selection.trim() && <p className="selection-preview">Frase seleccionada <q>{selection.trim()}</q></p>}
      {!valid && <p className="field-help">Conserva una frase tal como aparece en el comentario original.</p>}
      {duplicate && <p className="field-help">Esta frase ya está en las notas. Puedes elegir otra parte del comentario.</p>}
      {error && <p className="private-error" role="alert">{error}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
        <Button disabled={busy || !valid || duplicate} onClick={() => void save()}><Bookmark />{busy ? "Guardando…" : "Guardar nota"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function MessageComposer({ month, onSent }: { month: string; onSent: () => Promise<void> }) {
  const [topic, setTopic] = useState<MessageTopic>("comment");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const retry = useRef<{ key: string; body: string; topic: MessageTopic } | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending.current || !body.trim()) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      if (!retry.current || retry.current.body !== body.trim() || retry.current.topic !== topic) {
        retry.current = { key: crypto.randomUUID(), body: body.trim(), topic };
      }
      await write({ action: "send", requestKey: retry.current.key, monthStart: month, topic, body: body.trim() });
      retry.current = null;
      setBody(""); setTopic("comment");
      toast.success("Mensaje enviado a la presidencia.");
      await onSent();
    } catch (failed) { setError(messageOf(failed)); }
    finally { sending.current = false; setBusy(false); }
  };
  return <form className="panel private-panel message-compose" onSubmit={submit}>
    <div className="panel-heading"><div><h2>Escribir a la presidencia</h2>
      <p>Tu mensaje llegará a Administración de estaca por un canal privado.</p></div></div>
    <label className="private-field">Tipo de mensaje
      <select value={topic} disabled={busy} onChange={(event) => setTopic(event.target.value as MessageTopic)}>
        {Object.entries(messageTopics).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select>
    </label>
    <label className="private-field">Mensaje
      <Textarea rows={5} value={body} disabled={busy} maxLength={TEXT_LIMIT} required
        onChange={(event) => setBody(event.target.value)} placeholder="Escribe lo que quisieras compartir con la presidencia…" />
    </label>
    {error && <p className="private-error" role="alert">{error}</p>}
    <div className="message-footer"><span>{body.length.toLocaleString("es-CL")} / 5.000</span>
      <Button type="submit" disabled={busy || !body.trim()}><Send />{busy ? "Enviando…" : "Enviar mensaje"}</Button></div>
  </form>;
}

export function PresidencyView({ isAdmin, month }: { isAdmin: boolean; month: string }) {
  const list = usePrivateList<PresidencyMessage>("messages", month, true, "presidency");
  return <div className="view-stack">
    {!isAdmin && <MessageComposer key={month} month={month} onSent={list.refresh} />}
    <section className="panel private-panel">
      <div className="panel-heading"><div><h2>{isAdmin ? "Bandeja de la presidencia" : "Mis mensajes enviados"}</h2>
        {isAdmin && <p>Mensajes del Sumo Consejo y de las organizaciones para el mes seleccionado.</p>}</div><Inbox aria-hidden="true" /></div>
      {list.error && <LoadError message={list.error} retry={list.refresh} />}
      {list.loading ? <p role="status">Cargando mensajes…</p> : list.rows.length ?
        <ul className="message-list">{list.rows.map((message) =>
          <li key={message.id}><div className="message-heading"><strong>{isAdmin ? scopeLabel(message.scope) : messageTopics[message.topic]}</strong>
            <time dateTime={message.createdAt}>{new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time></div>
            {isAdmin && <small>{message.authorName} · {messageTopics[message.topic]}</small>}
            <p>{message.body}</p>
            {isAdmin && <HighlightButton source={{ type: "message", id: message.id, field: "body" }} text={message.body} />}
          </li>)}</ul> : !list.error && <p className="mini-empty">{isAdmin ? "Aún no hay mensajes para este mes." : "Los mensajes que envíes este mes aparecerán aquí."}</p>}
    </section>
  </div>;
}

export function CouncilNotesView() {
  const notes = useContext(NotesContext);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState("");
  if (!notes) return null;
  const remove = async (id: number) => {
    if (removing !== null || !window.confirm("¿Quitar esta nota de la tabla compartida de Administración? El comentario de origen se conserva.")) return;
    setRemoving(id); setError("");
    try {
      await write({ action: "remove_note", id });
      await notes.refresh();
      toast.success("Nota retirada del consejo.");
    } catch (failed) { setError(messageOf(failed)); }
    finally { setRemoving(null); }
  };
  return <section className="panel private-panel">
    <div className="panel-heading"><div><h2>Notas compartidas del mes</h2>
      <p>Todos los perfiles de Administración de estaca ven las mismas notas.</p></div><LockKeyhole aria-hidden="true" /></div>
    {notes.error && <LoadError message={notes.error} retry={notes.refresh} />}
    {error && <p className="private-error" role="alert">{error}</p>}
    {notes.loading ? <p role="status">Cargando notas…</p> : notes.rows.length ?
      <Table aria-label="Notas para consejo de estaca" className="council-notes-table">
        <TableHeader><TableRow><TableHead scope="col">Origen de la nota</TableHead><TableHead scope="col">Nota</TableHead></TableRow></TableHeader>
        <TableBody>{notes.rows.map((note) => <TableRow key={note.id}>
          <TableCell><strong>{scopeLabel(note.scope)}</strong>{note.wardName && <span>{note.wardName}</span>}
            {note.authorName && <span>{note.authorName}</span>}<small>{note.sourceLabel}</small></TableCell>
          <TableCell><p>{note.excerpt}</p><Button variant="ghost" size="sm" className="remove-note"
            disabled={removing !== null} onClick={() => void remove(note.id)}><X />Quitar de las notas</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table> : !notes.error && <p className="mini-empty">Destaca un comentario de un informe o un mensaje de la presidencia para agregar la primera nota del mes.</p>}
  </section>;
}
