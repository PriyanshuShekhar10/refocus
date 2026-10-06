"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowRight,
  Ban,
  BellOff,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  MailCheck,
  RefreshCw,
  TriangleAlert,
  UserMinus,
  X,
} from "lucide-react";

type Person = {
  id: string;
  name: string;
  first: string;
  username: string | null;
  email: string | null;
  attended: string | null;
};
type RSession = { id: string; version: string; ownerId: string; joinerId: string | null };
type RSlot = {
  start: string;
  end: string;
  durationMin: number;
  state: "past" | "live" | "soon" | "upcoming";
  minutesToStart: number;
  sessions: RSession[];
};
type Day = {
  date: string;
  loadedAt: string;
  slots: RSlot[];
  people: Record<string, Person>;
  blocks: [string, string][];
};
type Check = { key: string; label: string; ok: boolean };
type Result =
  | {
      ok: true;
      lines: string[];
      mails: { userId: string; name: string; status: "sent" | "off" | "failed" }[];
      at: string;
      title: string;
      finals: { label: string; tag: TagKey | null }[];
    }
  | { ok: false; error: string; checks: Check[] };

type TagKey = "open" | "matched" | "live" | "past" | "soon" | "removed";
const TAGS: Record<TagKey, { cls: string; label: string }> = {
  open: { cls: "bg-rf-line-soft text-rf-ink-soft", label: "Open slot" },
  matched: { cls: "bg-rf-plum-soft text-rf-plum-ink", label: "Matched" },
  live: { cls: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300", label: "In progress" },
  past: { cls: "bg-rf-line-soft text-rf-ink-soft", label: "Done" },
  soon: { cls: "bg-rf-amber-bg text-rf-amber-ink", label: "Starts soon" },
  removed: { cls: "bg-rf-danger-soft text-rf-danger", label: "Cancelled" },
};

const TZ = "Asia/Kolkata";
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fmtDay = (date: string) =>
  new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const shiftDate = (date: string, delta: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't load sessions.");
  return data as Day;
};

type Mode =
  | { kind: "move"; sid: string; pid: string; target: string | null }
  | { kind: "remove"; sid: string; pid: string }
  | { kind: "club"; a: string; b: string }
  | null;

const label = "text-[11.5px] font-medium uppercase tracking-[0.02em] text-rf-ink-mute";
const pillBtn =
  "inline-flex h-8 items-center rounded-full border border-rf-line bg-rf-card px-3 text-[13.5px] font-medium text-rf-ink-soft hover:bg-rf-line-soft";

function Tag({ t, text }: { t: TagKey | null; text?: string }) {
  if (!t) return null;
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${TAGS[t].cls}`}>
      {text ?? TAGS[t].label}
    </span>
  );
}

export default function AdminRematch({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const [date, setDate] = useState(todayIst);
  const { data, error, isLoading, mutate } = useSWR<Day>(`/api/admin/rematch?date=${date}`, fetcher, {
    revalidateOnFocus: false,
  });
  const [mode, setMode] = useState<Mode>(null);
  const [ownerChoice, setOwnerChoice] = useState<"handover" | "cancel" | null>(null);
  const [emailOff, setEmailOff] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [resultSlot, setResultSlot] = useState<string | null>(null);

  const reset = (next: Mode = null) => {
    setMode(next);
    setOwnerChoice(null);
    setEmailOff({});
    setNote("");
    setResult(null);
  };

  const people = data?.people ?? {};
  const P = (id: string | null | undefined) =>
    (id && people[id]) || { id: id ?? "", name: "Unknown", first: "Someone", username: null, email: null, attended: null };
  const blocker = (a: string, b: string) =>
    data?.blocks.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[0] ?? null;

  const findSession = (sid: string) => {
    for (const slot of data?.slots ?? []) {
      const s = slot.sessions.find((x) => x.id === sid);
      if (s) return { s, slot };
    }
    return null;
  };

  const focus = useMemo(() => {
    if (!mode || result) return null;
    const sid = mode.kind === "club" ? mode.a : mode.sid;
    return findSession(sid)?.slot ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, result, data]);

  // ── Plan for the side panel ────────────────────────────────────────────
  type Mail = { pid: string; subject: string; preview: string; pending?: boolean };
  type Row = { before: string; bt: TagKey | null; after: string; at: TagKey | null };
  const plan = (() => {
    if (!mode || !data) return null;
    if (mode.kind === "club") {
      const A = findSession(mode.a);
      const B = findSession(mode.b);
      if (!A || !B) return null;
      const a = A.s.ownerId;
      const b = B.s.ownerId;
      const t = fmtTime(A.slot.start);
      return {
        stage: "preview" as const,
        slot: A.slot,
        title: `Club ${P(a).first} and ${P(b).first}`,
        rows: [
          { before: P(a).first, bt: "open", after: `${P(a).first} ↔ ${P(b).first}`, at: "matched" },
          { before: P(b).first, bt: "open", after: `${P(b).first}'s slot removed`, at: "removed" },
        ] as Row[],
        mails: [
          { pid: a, subject: `${P(b).first} joined your session.`, preview: `Your ${t} session now has a partner: ${P(b).name}.` },
          { pid: b, subject: `You're matched with ${P(a).first}.`, preview: `You've joined ${P(a).first}'s ${t} session. Your own open slot was removed.` },
        ] as Mail[],
        checks: [
          `${P(a).first} and ${P(b).first} haven't blocked each other`,
          "Both are allowed to book (not banned or restricted)",
          "Both slots unchanged since the page loaded",
        ],
        confirm: `Club ${P(a).first} with ${P(b).first}`,
        ownerCase: false,
        moverPid: null as string | null,
        partnerPid: null as string | null,
        isOwner: false,
        src: A.s,
        targets: [] as { s: RSession; block: string | null }[],
        finals: [{ label: `${P(a).first} ↔ ${P(b).first}`, tag: "matched" as TagKey }],
        doneTitle: `${P(a).first} and ${P(b).first} are paired`,
        body: { action: "club", keepSessionId: mode.a, absorbSessionId: mode.b },
        expected: { [A.s.id]: A.s.version, [B.s.id]: B.s.version },
      };
    }
    const found = findSession(mode.sid);
    if (!found) return null;
    const { s: src, slot } = found;
    const m = mode.pid;
    const isOwner = src.ownerId === m;
    const partner = isOwner ? src.joinerId : src.ownerId;
    const t = fmtTime(slot.start);
    const targets = slot.sessions
      .filter((x) => !x.joinerId && x.id !== src.id)
      .map((x) => ({ s: x, block: blocker(m, x.ownerId) }));

    if (mode.kind === "move" && !mode.target) {
      return {
        stage: targets.length ? ("pick" as const) : ("empty" as const),
        slot, src, moverPid: m, partnerPid: partner, isOwner, targets,
        title: `Move ${P(m).name}`,
      };
    }

    const pair = `${P(src.ownerId).first} ↔ ${P(src.joinerId).first}`;
    let partnerAfter = "Choose an option above";
    let partnerTag: TagKey | null = null;
    if (!isOwner || ownerChoice === "handover") {
      partnerAfter = `${P(partner).first} (open)`;
      partnerTag = "open";
    } else if (ownerChoice === "cancel") {
      partnerAfter = `${P(partner).first}'s session removed`;
      partnerTag = "removed";
    }
    const rows: Row[] = [{ before: pair, bt: "matched", after: partnerAfter, at: partnerTag }];
    const mails: Mail[] = [];
    if (partner) {
      if (!isOwner || ownerChoice === "handover") {
        mails.push({
          pid: partner,
          subject: `${P(m).first} left your session.`,
          preview: isOwner
            ? `You're now the host of the ${t} session. It stays open for a new partner.`
            : `Your ${t} session is open again, so someone free at ${t} can join you.`,
        });
      } else if (ownerChoice === "cancel") {
        mails.push({
          pid: partner,
          subject: `${P(m).first} cancelled your session.`,
          preview: `Your ${t} session with ${P(m).first} was cancelled. You can book a new slot anytime.`,
        });
      } else {
        mails.push({ pid: partner, subject: "Depends on your choice above", preview: "Pick hand over or cancel to see this email.", pending: true });
      }
    }
    const expected: Record<string, string> = { [src.id]: src.version };

    if (mode.kind === "move" && mode.target) {
      const tgt = slot.sessions.find((x) => x.id === mode.target);
      if (!tgt) return null;
      const o = tgt.ownerId;
      expected[tgt.id] = tgt.version;
      rows.push({ before: P(o).first, bt: "open", after: `${P(o).first} ↔ ${P(m).first}`, at: "matched" });
      mails.push(
        { pid: o, subject: `${P(m).first} joined your session.`, preview: `Your ${t} session is now with ${P(m).name}. See you there.` },
        { pid: m, subject: `You're matched with ${P(o).first}.`, preview: `Same time, ${t}. You've been moved to ${P(o).first}'s session.` },
      );
      return {
        stage: "preview" as const, slot, src, moverPid: m, partnerPid: partner, isOwner, targets,
        title: `Move ${P(m).first} to ${P(o).first}`,
        rows, mails, ownerCase: isOwner && !!partner,
        checks: [
          `${P(m).first} and ${P(o).first} haven't blocked each other`,
          `${P(m).first} has no other session that clashes with ${t}`,
          `${P(m).first} is allowed to book (not banned or restricted)`,
          "Both sessions unchanged since the page loaded",
        ],
        confirm: `Move ${P(m).first} to ${P(o).first}'s session`,
        finals: [{ label: partnerAfter, tag: partnerTag }, { label: `${P(o).first} ↔ ${P(m).first}`, tag: "matched" as TagKey }],
        doneTitle: `${P(m).first} moved to ${P(o).first}'s session`,
        body: { action: "move", sessionId: src.id, userId: m, targetSessionId: tgt.id, ownerChoice: ownerChoice ?? undefined },
        expected,
      };
    }
    return {
      stage: "preview" as const, slot, src, moverPid: m, partnerPid: partner, isOwner, targets,
      title: `Remove ${P(m).first} from session`,
      rows, mails, ownerCase: isOwner && !!partner,
      checks: ["Session unchanged since the page loaded"],
      confirm: `Remove ${P(m).first} from session`,
      finals: [{ label: partnerAfter, tag: partnerTag }, { label: `${P(m).first} has no session at ${t}`, tag: null }],
      doneTitle: `${P(m).first} removed from the session`,
      body: { action: "remove", sessionId: src.id, userId: m, ownerChoice: ownerChoice ?? undefined },
      expected,
    };
  })();

  const confirm = async () => {
    if (!plan || plan.stage !== "preview") return;
    setSubmitting(true);
    setResultSlot(plan.slot.start);
    try {
      const emails: Record<string, boolean> = {};
      for (const mail of plan.mails) emails[mail.pid] = !emailOff[mail.pid];
      const res = await fetch("/api/admin/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...plan.body, emails, note, expected: plan.expected }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, error: out.error || "Something went wrong.", checks: out.checks ?? [] });
      } else {
        setResult({ ok: true, lines: out.lines, mails: out.mails, at: out.at, title: plan.doneTitle, finals: plan.finals });
        void mutate();
      }
    } catch {
      setResult({ ok: false, error: "Network error. Refresh to see whether anything changed.", checks: [] });
    } finally {
      setSubmitting(false);
    }
  };

  const helper = !mode
    ? "Pick a person in a matched pair, then an open slot at the same time."
    : mode.kind === "move" && !mode.target && plan?.slot
      ? `Now pick an open slot at ${fmtTime(plan.slot.start)}. Greyed-out slots can't take ${P(mode.pid).first}.`
      : "Review the change on the right before applying it.";

  const loadedAt = data?.loadedAt ? fmtTime(data.loadedAt) : null;
  const panelOpen = !!plan || !!result;
  const slotTime = result && resultSlot ? fmtTime(resultSlot) : plan?.slot ? fmtTime(plan.slot.start) : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { reset(); setDate(shiftDate(date, -1)); }} aria-label="Previous day" className="grid h-8 w-8 place-items-center rounded-full border border-rf-line bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <p className="min-w-[112px] text-center text-[15px] font-semibold text-rf-ink">{fmtDay(date)}</p>
          <button type="button" onClick={() => { reset(); setDate(shiftDate(date, 1)); }} aria-label="Next day" className="grid h-8 w-8 place-items-center rounded-full border border-rf-line bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => { reset(); setDate(todayIst()); }} className={pillBtn}>Today</button>
          <button type="button" onClick={() => { reset(); void mutate(); }} className={`${pillBtn} gap-1.5`}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <p className="text-xs text-rf-ink-mute">
          Times in IST (UTC+5:30){loadedAt ? ` · Loaded ${loadedAt}` : ""}
        </p>
      </div>
      <p className="text-[13.5px] text-rf-ink-soft">{helper}</p>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3">
          {error ? (
            <div className="rounded-xl border border-rf-danger/35 bg-rf-danger-soft px-4 py-3 text-sm text-rf-danger">{(error as Error).message}</div>
          ) : isLoading && !data ? (
            <div className="rounded-xl border border-rf-line bg-rf-card px-4 py-8 text-center text-rf-ink-mute">Loading sessions…</div>
          ) : !data?.slots.length ? (
            <div className="rounded-xl border border-rf-line bg-rf-card px-4 py-8 text-center text-rf-ink-mute">No sessions on {fmtDay(date)}.</div>
          ) : (
            data.slots.map((slot) => {
              const locked = slot.state === "past" || slot.state === "live";
              const list = [...slot.sessions].sort((a, b) => (a.joinerId ? 1 : 0) - (b.joinerId ? 1 : 0));
              const opens = list.filter((s) => !s.joinerId);
              const other = focus && focus.start !== slot.start;
              const sameSlot = focus?.start === slot.start;
              const selecting = mode?.kind === "move" && !result;
              const tag: TagKey | null = slot.state === "upcoming" ? null : slot.state;
              return (
                <section key={slot.start} className={`rounded-xl border border-rf-line bg-rf-card transition-opacity ${other ? "opacity-45" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rf-line-soft px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-[15px] font-semibold tabular-nums text-rf-ink">{fmtTime(slot.start)}</p>
                      <p className="text-xs tabular-nums text-rf-ink-mute">until {fmtTime(slot.end)} · {slot.durationMin} min</p>
                      <Tag t={tag} text={slot.state === "soon" ? `Starts in ${slot.minutesToStart} min` : undefined} />
                    </div>
                    <p className="text-xs text-rf-ink-mute">
                      {other ? "Different time slot" : locked ? (slot.state === "live" ? "Live, can't be rematched" : "Past, can't be rematched") : `${opens.length} open · ${list.length - opens.length} matched`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 px-4 pb-4 pt-3">
                    {list.map((s) => {
                      const isOpen = !s.joinerId;
                      const type: TagKey = locked ? (slot.state === "live" ? "live" : "past") : isOpen ? "open" : "matched";
                      let tile = "border-rf-line bg-rf-card";
                      let hint = "";
                      let hintCls = "text-rf-ink-mute";
                      let onTile: (() => void) | null = null;
                      if (selecting && mode?.kind === "move" && sameSlot && isOpen) {
                        const b = blocker(mode.pid, s.ownerId);
                        if (b) {
                          tile = "border-rf-line bg-rf-bg opacity-55";
                          hint = `Unavailable: ${P(b).first} blocked ${P(b === s.ownerId ? mode.pid : s.ownerId).first}`;
                          hintCls = "text-rf-danger";
                        } else if (mode.target === s.id) {
                          tile = "cursor-pointer border-rf-primary bg-rf-plum-soft";
                          hint = `${P(mode.pid).first} will move here`;
                          hintCls = "text-rf-plum-ink";
                          onTile = () => { setMode({ ...mode, target: null }); setOwnerChoice(null); };
                        } else {
                          tile = "cursor-pointer border-dashed border-rf-primary bg-rf-card";
                          hint = `Move ${P(mode.pid).first} here`;
                          hintCls = "text-rf-plum-ink";
                          onTile = () => setMode({ ...mode, target: s.id });
                        }
                      } else if (selecting && mode?.kind === "move" && sameSlot && !isOpen && s.id !== mode.sid) {
                        tile = "border-rf-line bg-rf-card opacity-50";
                        hint = "Already matched";
                      } else if (mode?.kind === "club" && !result && sameSlot && (s.id === mode.a || s.id === mode.b)) {
                        tile = "border-rf-primary bg-rf-plum-soft";
                      } else if (mode && !result && sameSlot && mode.kind !== "move" && !(mode.kind === "remove" && s.id === mode.sid)) {
                        tile = "border-rf-line bg-rf-card opacity-50";
                      }
                      const peers = opens.filter((o) => o.id !== s.id && o.ownerId !== s.ownerId && !blocker(o.ownerId, s.ownerId));
                      const showClub = !locked && isOpen && !mode && peers.length > 0 && opens[0]?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={onTile ?? undefined}
                          className={`flex min-w-0 max-w-[380px] flex-[1_1_280px] flex-col gap-0.5 rounded-[10px] border p-1.5 transition-all ${tile}`}
                        >
                          <div className="flex items-center justify-between gap-2 px-2 py-1">
                            <Tag t={type} />
                            {showClub ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); reset({ kind: "club", a: s.id, b: peers[0].id }); }}
                                className="rounded-md border border-rf-line bg-rf-card px-2 py-1 text-xs font-medium text-rf-ink hover:bg-rf-line-soft"
                              >
                                Club with {P(peers[0].ownerId).name}
                              </button>
                            ) : null}
                          </div>
                          {[s.ownerId, s.joinerId].filter(Boolean).map((pid) => {
                            const p = P(pid);
                            const sel = mode && mode.kind !== "club" && !result && mode.sid === s.id && mode.pid === pid;
                            const canPick = !locked && !isOpen;
                            return (
                              <div
                                key={pid}
                                role={canPick ? "button" : undefined}
                                tabIndex={canPick ? 0 : undefined}
                                onClick={canPick ? (e) => { e.stopPropagation(); if (sel) reset(); else reset({ kind: "move", sid: s.id, pid: pid!, target: null }); } : undefined}
                                className={`flex flex-col gap-px rounded-lg px-2 py-1.5 ${sel ? "bg-rf-plum-soft ring-1 ring-inset ring-rf-primary" : canPick ? "cursor-pointer hover:bg-rf-line-soft" : ""}`}
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="min-w-0 truncate font-medium text-rf-ink">
                                    {p.name}
                                    {!isOpen ? <span className="ml-1.5 text-[11px] font-normal text-rf-ink-mute">{pid === s.ownerId ? "owner" : "joiner"}</span> : null}
                                  </p>
                                  {p.attended ? <p className="shrink-0 text-[11.5px] tabular-nums text-rf-ink-mute">attended {p.attended}</p> : null}
                                </div>
                                <p className="truncate text-xs text-rf-ink-mute">
                                  {p.username ? <span className="text-rf-plum-ink">@{p.username}</span> : null}
                                  {p.username && p.email ? " · " : ""}
                                  {p.email}
                                </p>
                              </div>
                            );
                          })}
                          {hint ? <p className={`px-2 pb-1 pt-0.5 text-xs font-medium ${hintCls}`}>{hint}</p> : null}
                        </div>
                      );
                    })}
                    {!locked && opens.length === 0 ? (
                      <p className="self-center text-xs text-rf-ink-mute">No open slots at {fmtTime(slot.start)}</p>
                    ) : null}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {panelOpen && (plan || result) ? (
          <aside className="sticky top-0 min-w-[300px] flex-[0_1_400px] self-start rounded-xl border border-rf-line bg-rf-card shadow-[0_1px_3px_rgba(0,0,0,.06)]">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium uppercase tracking-[0.03em] text-rf-ink-mute">
                  {fmtDay(date)} · {slotTime} IST
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-rf-ink">
                  {result ? (result.ok ? "Done" : "Couldn't apply") : plan?.title}
                </h2>
              </div>
              <button type="button" onClick={() => reset()} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg border border-rf-line bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!result && plan?.slot.state === "soon" ? (
              <div className="mx-4 mb-3 flex gap-2 rounded-[10px] bg-rf-amber-bg px-3 py-2.5 text-[13px] text-rf-amber-ink">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Starting soon ({slotTime}, in {plan.slot.minutesToStart} min). They may already be joining the call.</span>
              </div>
            ) : null}

            {!result && plan && (plan.stage === "pick" || plan.stage === "empty") && plan.moverPid ? (
              <div className="flex flex-col gap-3 border-t border-rf-line-soft p-4">
                <div className="rounded-[10px] bg-rf-plum-soft px-3 py-2.5">
                  <p className="font-medium text-rf-ink">
                    {P(plan.moverPid).name} <span className="text-[11px] font-normal text-rf-plum-ink">{plan.isOwner ? "owner" : "joiner"}</span>
                  </p>
                  <p className="text-xs text-rf-ink-soft">
                    {P(plan.moverPid).username ? <span className="text-rf-plum-ink">@{P(plan.moverPid).username}</span> : null}
                    {P(plan.moverPid).email ? ` · ${P(plan.moverPid).email}` : ""}
                    {P(plan.moverPid).attended ? ` · attended ${P(plan.moverPid).attended}` : ""}
                  </p>
                  <p className="mt-1.5 text-xs text-rf-ink-soft">
                    Now in {P(plan.src.ownerId).first} ↔ {P(plan.src.joinerId).first} at {slotTime}
                  </p>
                </div>
                {plan.stage === "pick" ? (
                  <>
                    <p className={label}>Open slots at {slotTime}</p>
                    <div className="flex flex-col gap-1.5">
                      {plan.targets.map(({ s, block }) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={!!block}
                          onClick={() => mode?.kind === "move" && setMode({ ...mode, target: s.id })}
                          className={`flex w-full items-center justify-between gap-3 rounded-[10px] border bg-rf-card px-3 py-2 text-left text-sm text-rf-ink ${
                            block ? "cursor-not-allowed border-rf-line opacity-60" : "border-dashed border-rf-primary"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-medium">{P(s.ownerId).name}</span>
                            <span className={`block text-xs ${block ? "text-rf-danger" : "text-rf-ink-mute"}`}>
                              {block
                                ? `Unavailable: ${P(block).first} blocked ${P(block === s.ownerId ? plan.moverPid! : s.ownerId).first}`
                                : [P(s.ownerId).username ? `@${P(s.ownerId).username}` : null, P(s.ownerId).attended ? `attended ${P(s.ownerId).attended}` : null].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          {block ? <Ban className="h-3.5 w-3.5 shrink-0 text-rf-danger" /> : <ArrowRight className="h-3.5 w-3.5 shrink-0 text-rf-plum-ink" />}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-rf-line p-4">
                    <p className="font-medium text-rf-ink">No open slots at {slotTime}</p>
                    <p className="text-[13px] text-rf-ink-soft">Rematching only works inside the same time slot.</p>
                    {(() => {
                      const near = (data?.slots ?? []).filter(
                        (sl) => sl.state === "upcoming" && sl.start !== plan.slot.start && Math.abs(new Date(sl.start).getTime() - new Date(plan.slot.start).getTime()) <= 60 * 60000 && sl.sessions.some((x) => !x.joinerId),
                      );
                      return near.length ? (
                        <>
                          <p className="text-[13px] text-rf-ink-soft">Nearby slots with someone waiting:</p>
                          {near.map((sl) => (
                            <p key={sl.start} className="text-[13px] text-rf-ink">
                              <span className="font-semibold tabular-nums">{fmtTime(sl.start)}</span>
                              <span className="text-rf-ink-mute"> · {sl.sessions.filter((x) => !x.joinerId).map((x) => P(x.ownerId).name).join(", ")} waiting</span>
                            </p>
                          ))}
                          <p className="text-xs text-rf-ink-mute">To use one of these, {P(plan.moverPid).first} would need to rebook.</p>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => mode && mode.kind === "move" && setMode({ kind: "remove", sid: mode.sid, pid: mode.pid })}
                  className="inline-flex items-center gap-1.5 self-start rounded-md border border-rf-line bg-rf-card px-2 py-1 text-xs font-medium text-rf-ink hover:bg-rf-line-soft"
                >
                  <UserMinus className="h-3.5 w-3.5" /> Remove {P(plan.moverPid).first} without rematching
                </button>
              </div>
            ) : null}

            {!result && plan && plan.stage === "preview" ? (
              <div>
                {plan.ownerCase && plan.moverPid && plan.partnerPid ? (
                  <div className="flex flex-col gap-2 border-t border-rf-line-soft p-4">
                    <p className={label}>{P(plan.moverPid).first} owns this session</p>
                    <p className="text-[13px] text-rf-ink-soft">
                      Owners can&apos;t simply leave. Choose what happens to {P(plan.partnerPid).first}&apos;s {slotTime} session before confirming.
                    </p>
                    {([
                      ["handover", `Hand the session to ${P(plan.partnerPid).first}`, `${P(plan.partnerPid).first} becomes the owner and keeps the ${slotTime} slot, open for someone else to join. Gets “${P(plan.moverPid).first} left your session.”`, true],
                      ["cancel", "Cancel the session", `The slot is removed. ${P(plan.partnerPid).first} loses the ${slotTime} session and gets “${P(plan.moverPid).first} cancelled your session.”`, false],
                    ] as const).map(([key, title, desc, rec]) => {
                      const on = ownerChoice === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setOwnerChoice(key)}
                          className={`flex w-full gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-sm text-rf-ink ${on ? "border-rf-primary bg-rf-plum-soft" : "border-rf-line bg-rf-card"}`}
                        >
                          <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] ${on ? "border-rf-primary" : "border-rf-ink-mute"}`}>
                            <span className={`h-2 w-2 rounded-full ${on ? "bg-rf-primary" : ""}`} />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                              {title}
                              {rec ? <span className="rounded-full bg-rf-plum-soft px-2 py-0.5 text-[10px] font-medium text-rf-plum-ink">Recommended</span> : null}
                            </span>
                            <span className="text-[12.5px] text-rf-ink-soft">{desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-rf-line-soft p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] gap-x-2">
                    <p className={label}>Before</p>
                    <span />
                    <p className={label}>After</p>
                  </div>
                  {plan.rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-stretch gap-2">
                      <div className="flex flex-col items-start gap-1 rounded-lg border border-rf-line-soft bg-rf-bg px-2.5 py-2">
                        <p className="text-[13px] font-medium text-rf-ink-soft">{r.before}</p>
                        <Tag t={r.bt} />
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 self-center text-rf-ink-mute" />
                      <div className={`flex flex-col items-start gap-1 rounded-lg border bg-rf-card px-2.5 py-2 ${r.at ? "border-rf-primary" : "border-rf-line"}`}>
                        <p className="text-[13px] font-medium text-rf-ink">{r.after}</p>
                        <Tag t={r.at} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 border-t border-rf-line-soft p-4">
                  <p className={`${label} mb-1`}>
                    Emails · {plan.mails.filter((x) => !x.pending && !emailOff[x.pid]).length} of {plan.mails.length} will send
                  </p>
                  {plan.mails.map((mail) => {
                    const on = !mail.pending && !emailOff[mail.pid];
                    return (
                      <div key={mail.pid} className={`flex items-start justify-between gap-3 border-b border-rf-line-soft py-2 ${mail.pending ? "opacity-60" : on ? "" : "opacity-70"}`}>
                        <div className="min-w-0">
                          <p className="text-xs text-rf-ink-mute">
                            To <span className="font-medium text-rf-ink">{P(mail.pid).name}</span>
                            {P(mail.pid).email ? ` · ${P(mail.pid).email}` : ""}
                          </p>
                          <p className="mt-0.5 text-[13px] font-medium text-rf-ink">{mail.pending ? mail.subject : `“${mail.subject}”`}</p>
                          <p className="mt-px text-xs text-rf-ink-soft">{mail.preview}</p>
                          {!P(mail.pid).email ? (
                            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-rf-warn">
                              <BellOff className="h-3 w-3" /> No email address on file
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`Email ${P(mail.pid).name}`}
                          disabled={!!mail.pending}
                          onClick={() => setEmailOff((prev) => ({ ...prev, [mail.pid]: !prev[mail.pid] }))}
                          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${on ? "bg-rf-primary" : "bg-rf-line"}`}
                        >
                          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]" style={{ left: on ? 22 : 2 }} />
                        </button>
                      </div>
                    );
                  })}
                  <label htmlFor="rm-note" className="mt-2 text-xs font-medium text-rf-ink-soft">
                    Note from the Refocus team (optional)
                  </label>
                  <textarea
                    id="rm-note"
                    rows={2}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Added to every email that's switched on"
                    className="w-full resize-y rounded-[10px] border border-rf-line bg-rf-card px-2.5 py-2 text-[13px] text-rf-ink"
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-rf-line-soft p-4">
                  <p className={label}>Safety checks</p>
                  {plan.checks.map((c) => (
                    <div key={c} className="flex items-start gap-2">
                      <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rf-ink-mute" />
                      <div>
                        <p className="text-[13px] text-rf-ink">{c}</p>
                        <p className="text-xs text-rf-ink-mute">Checked when you confirm</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 border-t border-rf-line-soft p-4">
                  {(() => {
                    const blocked = plan.ownerCase && !ownerChoice;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => void confirm()}
                          disabled={blocked || submitting}
                          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-rf-primary px-4 py-2.5 text-sm font-semibold text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50"
                        >
                          {submitting ? "Checking and applying…" : plan.confirm}
                        </button>
                        {blocked ? <p className="text-center text-xs text-rf-ink-mute">Choose hand over or cancel first.</p> : null}
                      </>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => (mode?.kind === "move" ? (setMode({ ...mode, target: null }), setOwnerChoice(null)) : reset())}
                    className="w-full rounded-[10px] border border-rf-line bg-rf-card px-4 py-2 text-sm font-medium text-rf-ink hover:bg-rf-line-soft"
                  >
                    {mode?.kind === "move" ? "Pick a different slot" : "Cancel"}
                  </button>
                </div>
              </div>
            ) : null}

            {result?.ok ? (
              <div className="flex flex-col gap-3.5 border-t border-rf-line-soft p-4">
                <div className="flex gap-2.5 rounded-xl bg-rf-success-soft p-3">
                  <CircleCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-rf-success" />
                  <div>
                    <p className="font-semibold text-rf-ink">{result.title}</p>
                    <p className="mt-0.5 text-[13px] text-rf-ink-soft">{fmtDay(date)} · {slotTime} IST</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={label}>Now</p>
                  {result.finals.map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-2 rounded-lg border border-rf-line-soft px-2.5 py-2">
                      <p className="text-[13px] font-medium text-rf-ink">{f.label}</p>
                      <Tag t={f.tag} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={label}>Emails</p>
                  {result.mails.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2 text-[13px]">
                      {m.status === "sent" ? <MailCheck className="h-3.5 w-3.5 text-rf-success" /> : <BellOff className="h-3.5 w-3.5 text-rf-ink-mute" />}
                      <span className="text-rf-ink">{m.name}</span>
                      <span className="text-rf-ink-mute">
                        · {m.status === "sent" ? "Sent" : m.status === "off" ? "Not sent (switched off)" : "Not sent (email failed)"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-rf-ink-mute">
                  Recorded in{" "}
                  <button type="button" onClick={onOpenHistory} className="text-rf-plum-ink hover:underline">History</button>{" "}
                  at {fmtTime(result.at)} by you.
                </p>
                <button type="button" onClick={() => reset()} className="w-full rounded-[10px] border border-rf-line bg-rf-card px-4 py-2 text-sm font-medium text-rf-ink hover:bg-rf-line-soft">
                  Done
                </button>
              </div>
            ) : null}

            {result && !result.ok ? (
              <div className="flex flex-col gap-3.5 border-t border-rf-line-soft p-4">
                <div className="flex gap-2.5 rounded-xl border border-rf-danger/35 bg-rf-danger-soft p-3">
                  <CircleX className="mt-0.5 h-[18px] w-[18px] shrink-0 text-rf-danger" />
                  <div>
                    <p className="font-semibold text-rf-danger">Nothing was changed</p>
                    <p className="mt-0.5 text-[13px] text-rf-ink-soft">{result.error}</p>
                  </div>
                </div>
                {result.checks.length ? (
                  <div className="flex flex-col gap-2">
                    {result.checks.map((c) => (
                      <div key={c.key} className="flex items-start gap-2">
                        {c.ok ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rf-success" /> : <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rf-danger" />}
                        <p className="text-[13px] text-rf-ink">{c.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => { reset(); void mutate(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-rf-primary px-4 py-2.5 text-sm font-semibold text-rf-on-primary hover:bg-rf-primary-hover"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh slots
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
