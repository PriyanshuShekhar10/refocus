"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BsStars } from "react-icons/bs";
import {
  FiSend,
  FiCheck,
  FiClock,
  FiCalendar,
  FiTarget,
  FiLoader,
} from "react-icons/fi";

/* ───── types ───── */
type Proposal = {
  start: string;
  end: string;
  durationMin: 25 | 50 | 75;
  sessionType: "focus" | "deep-work" | "learning";
  goal: string;
  selected: boolean; // local toggle
};

type Message =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      proposals?: Proposal[];
      friend?: { id: string; name: string } | null;
    }
  | { role: "system"; text: string };

/* ───── helpers ───── */
function formatDate(iso: string) {
  const d = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const typeColors: Record<string, string> = {
  focus: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "deep-work":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  learning:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const SUGGESTIONS = [
  "3 evening study sessions this week for my Physics exam",
  "A 75-min deep work session tomorrow morning for coding",
  "Daily 25-min focus sessions for the rest of the week",
  "One learning session on Saturday afternoon for Spanish",
];

export default function SmartScheduler() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.error || "Something went wrong. Try again.",
          },
        ]);
        return;
      }

      const proposals: Proposal[] = (data.proposals ?? []).map(
        (p: Omit<Proposal, "selected">) => ({
          ...p,
          selected: true,
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reasoning || "Here's what I came up with:",
          proposals,
          friend: data.friend ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Network error — please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ── toggle a proposal on/off ── */
  const toggleProposal = (msgIndex: number, propIndex: number) => {
    setMessages((prev) =>
      prev.map((m, mi) => {
        if (mi !== msgIndex || m.role !== "assistant" || !m.proposals) return m;
        return {
          ...m,
          proposals: m.proposals.map((p, pi) =>
            pi === propIndex ? { ...p, selected: !p.selected } : p
          ),
        };
      })
    );
  };

  const confirmBooking = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (msg.role !== "assistant" || !msg.proposals) return;

    const selected = msg.proposals.filter((p) => p.selected);
    if (selected.length === 0) return;

    setConfirming(true);

    try {
      const friendId =
        msg.role === "assistant" ? msg.friend?.id : undefined;

      const res = await fetch("/api/ai/schedule/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessions: selected.map((p) => ({
            start: p.start,
            end: p.end,
            durationMin: p.durationMin,
            sessionType: p.sessionType,
            goal: p.goal,
          })),
          friendId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "system", text: `Error: ${data.error}` },
        ]);
        return;
      }

      const parts: string[] = [];
      if (data.totalCreated > 0) {
        parts.push(
          `${data.totalCreated} session${data.totalCreated > 1 ? "s" : ""} booked!`
        );
      }
      if (data.totalErrors > 0) {
        parts.push(
          `${data.totalErrors} couldn't be booked: ${data.errors.join("; ")}`
        );
      }

      setMessages((prev) => [
        ...prev,
        { role: "system", text: parts.join(" ") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "system", text: "Failed to book — check your connection." },
      ]);
    } finally {
      setConfirming(false);
    }
  };

  /* ── render ── */
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BsStars size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Smart Scheduler
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Describe your schedule in plain English and let AI book it
            </p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-5">
              <BsStars size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              What would you like to schedule?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Just describe what you want in plain language — I&apos;ll turn it
              into concrete sessions you can book instantly.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, mi) => (
          <div key={mi}>
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-sm">
                  {msg.text}
                </div>
              </div>
            )}

            {msg.role === "assistant" && (
              <div className="flex justify-start">
                <div className="max-w-[90%] space-y-3">
                  {/* Reasoning text */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BsStars size={14} />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 pt-1">
                      {msg.text}
                    </p>
                  </div>

                  {/* Friend tag */}
                  {msg.friend && (
                    <div className="ml-9 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold">
                        {msg.friend.name.charAt(0).toUpperCase()}
                      </span>
                      Booking with {msg.friend.name}
                    </div>
                  )}

                  {/* Proposal cards */}
                  {msg.proposals && msg.proposals.length > 0 && (
                    <div className="ml-9 space-y-2">
                      {msg.proposals.map((p, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => toggleProposal(mi, pi)}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                            p.selected
                              ? "border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {/* Goal */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <FiTarget className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {p.goal}
                                </span>
                              </div>
                              {/* Date + time + duration */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <FiCalendar className="w-3 h-3" />
                                  {formatDate(p.start)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FiClock className="w-3 h-3" />
                                  {formatTime(p.start)} ·{" "}
                                  {p.durationMin}min
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[p.sessionType] || ""}`}
                                >
                                  {p.sessionType}
                                </span>
                              </div>
                            </div>

                            {/* Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                p.selected
                                  ? "border-indigo-500 bg-indigo-500 text-white"
                                  : "border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {p.selected && (
                                <FiCheck className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </button>
                      ))}

                      {/* Confirm bar */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {msg.proposals.filter((p) => p.selected).length} of{" "}
                          {msg.proposals.length} selected
                        </span>
                        <button
                          onClick={() => confirmBooking(mi)}
                          disabled={
                            confirming ||
                            msg.proposals.filter((p) => p.selected)
                              .length === 0
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                        >
                          {confirming ? (
                            <FiLoader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FiCheck className="w-3.5 h-3.5" />
                          )}
                          {confirming ? "Booking…" : "Confirm & Book"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.role === "system" && (
              <div className="flex justify-center">
                <div className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 text-center max-w-md">
                  {msg.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <BsStars size={14} />
              </div>
              <div className="flex gap-1 px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 pt-3 border-t border-gray-200 dark:border-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Book 3 study sessions this week in the evenings…"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 disabled:opacity-50 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
