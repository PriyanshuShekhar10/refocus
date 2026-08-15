"use client";

import Link from "next/link";
import { Clock, UserPlus, MessageSquare, Sparkles } from "lucide-react";

const STEPS = [
  {
    n: "1",
    title: "Pick a session length",
    body: "Choose 25, 50, or 75 minutes — match the timer to the task.",
  },
  {
    n: "2",
    title: "Get a partner",
    body: "Match with someone new, or invite a friend who's also there to focus.",
  },
  {
    n: "3",
    title: "Share your goal",
    body: "Say what you'll work on in one line. That makes the commitment real.",
  },
  {
    n: "4",
    title: "Work, then check in",
    body: "Focus side by side with a shared timer. Celebrate progress at the end.",
  },
] as const;

export default function WelcomeBoard() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5D1C6A]/10 text-[#5D1C6A]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight">
              Welcome to Refocus
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Quiet co-working for accountability — not another meeting. Here&apos;s
              how to get started.
            </p>
          </div>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex gap-3 rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5D1C6A] text-[11px] font-semibold text-white">
                {step.n}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-2">
          <Link
            href="/dashboard?tab=dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5D1C6A] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Clock className="h-4 w-4" />
            Start a session
          </Link>
          <Link
            href="/dashboard?tab=friends"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <UserPlus className="h-4 w-4" />
            Find a partner
          </Link>
        </div>

        <div className="rounded-xl border border-dashed border-border px-3 py-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Community feed</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Use the feed next to this board to share wins, ask for advice, and
                cheer others on. Keep it kind and on-topic — focus, study, work,
                goals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
