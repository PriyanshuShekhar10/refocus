"use client";

import { useState } from "react";
import { Check, ListChecks, X } from "lucide-react";
import {
  SESSION_TASK_TITLE_MAX,
  partnerFirstName,
  type SessionTaskDTO,
} from "@/lib/sessionTasks";
import type { useSessionTasks } from "@/hooks/useSessionTasks";

type Tone = "call" | "page";
type TasksState = ReturnType<typeof useSessionTasks>;

const tones: Record<
  Tone,
  {
    heading: string;
    muted: string;
    item: string;
    itemDone: string;
    highlight: string;
    input: string;
    check: string;
    checkOn: string;
    deleteBtn: string;
  }
> = {
  call: {
    heading: "text-slate-100",
    muted: "text-slate-400",
    item: "text-slate-100",
    itemDone: "text-slate-500 line-through",
    highlight: "bg-[#CA5995]/20",
    input:
      "border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus:border-[#CA5995]",
    check: "border-white/30",
    checkOn: "border-[#CA5995] bg-[#CA5995] text-white",
    deleteBtn: "text-slate-500 hover:text-white",
  },
  page: {
    heading: "text-gray-900 dark:text-gray-100",
    muted: "text-gray-500 dark:text-gray-400",
    item: "text-gray-900 dark:text-gray-100",
    itemDone: "text-gray-400 line-through",
    highlight: "bg-[#CA5995]/10",
    input:
      "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#5D1C6A] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100",
    check: "border-gray-300 dark:border-gray-600",
    checkOn: "border-[#5D1C6A] bg-[#5D1C6A] text-white",
    deleteBtn: "text-gray-400 hover:text-gray-800 dark:hover:text-white",
  },
};

function TaskRow({
  task,
  editable,
  highlighted,
  tone,
  onToggle,
  onDelete,
}: {
  task: SessionTaskDTO;
  editable: boolean;
  highlighted: boolean;
  tone: Tone;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}) {
  const t = tones[tone];
  return (
    <li
      className={`group flex items-start gap-2 rounded-md px-1.5 py-1.5 transition-colors ${
        highlighted ? t.highlight : ""
      }`}
    >
      {editable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
          onClick={() => onToggle(!task.done)}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            task.done ? t.checkOn : t.check
          }`}
        >
          {task.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </button>
      ) : (
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            task.done ? t.checkOn : t.check
          }`}
        >
          {task.done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 text-sm leading-5 ${
          task.done ? t.itemDone : t.item
        }`}
      >
        {task.title}
      </span>
      {editable ? (
        <button
          type="button"
          aria-label="Remove task"
          onClick={onDelete}
          className={`mt-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${t.deleteBtn}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </li>
  );
}

function TaskComposer({
  tone,
  disabled,
  onAdd,
}: {
  tone: Tone;
  disabled: boolean;
  onAdd: (title: string) => void;
}) {
  const [value, setValue] = useState("");
  const t = tones[tone];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const title = value.trim();
        if (!title) return;
        onAdd(title);
        setValue("");
      }}
    >
      <input
        value={value}
        maxLength={SESSION_TASK_TITLE_MAX}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task and press Enter"
        className={`w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none disabled:opacity-50 ${t.input}`}
      />
    </form>
  );
}

export function SessionTaskPanel({
  tasks,
  partnerName,
  tone = "call",
}: {
  tasks: TasksState;
  partnerName: string | null;
  tone?: Tone;
}) {
  const t = tones[tone];
  const first = partnerFirstName(partnerName);
  const {
    yours,
    partnerTasks,
    loading,
    error,
    highlightedIds,
    addTask,
    toggleTask,
    deleteTask,
    canAdd,
  } = tasks;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <section>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${t.heading}`}>
          You
        </h3>
        {loading && yours.length === 0 ? (
          <p className={`mt-2 text-xs ${t.muted}`}>Loading…</p>
        ) : yours.length === 0 ? (
          <p className={`mt-2 text-xs ${t.muted}`}>
            What are you working on this block?
          </p>
        ) : (
          <ul className="mt-1">
            {yours.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                editable
                highlighted={false}
                tone={tone}
                onToggle={(done) => void toggleTask(task.id, done)}
                onDelete={() => void deleteTask(task.id)}
              />
            ))}
          </ul>
        )}
        <div className="mt-2">
          <TaskComposer
            tone={tone}
            disabled={!canAdd}
            onAdd={(title) => void addTask(title)}
          />
        </div>
      </section>

      <section>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${t.heading}`}>
          {first || "Partner"}
        </h3>
        {partnerTasks.length === 0 ? (
          <p className={`mt-2 text-xs ${t.muted}`}>
            {first ? `Waiting for ${first}…` : "Waiting for your partner…"}
          </p>
        ) : (
          <ul className="mt-1">
            {partnerTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                editable={false}
                highlighted={highlightedIds.has(task.id)}
                tone={tone}
                onToggle={() => {}}
                onDelete={() => {}}
              />
            ))}
          </ul>
        )}
      </section>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function SessionTaskPill({
  youDone,
  youTotal,
  partnerDone,
  partnerTotal,
  partnerName,
  open,
  onToggle,
}: {
  youDone: number;
  youTotal: number;
  partnerDone: number;
  partnerTotal: number;
  partnerName: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const first = partnerFirstName(partnerName);
  const partnerLabel =
    partnerTotal > 0 && first
      ? ` · ${first} ${partnerDone}/${partnerTotal}`
      : "";

  return (
    <button
      type="button"
      aria-pressed={open}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        open
          ? "border-[#CA5995]/50 bg-[#CA5995]/20 text-white"
          : "border-white/20 text-white hover:bg-white/10"
      }`}
    >
      <ListChecks className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Tasks</span>
      <span>
        {youDone}/{youTotal}
      </span>
      {partnerLabel ? (
        <span className="hidden text-slate-300 sm:inline">{partnerLabel}</span>
      ) : null}
    </button>
  );
}

export function SessionTaskRail({
  tasks,
  partnerName,
  onClose,
}: {
  tasks: TasksState;
  partnerName: string | null;
  onClose: () => void;
}) {
  return (
    <aside className="hidden h-full w-[280px] shrink-0 flex-col border-l border-white/10 bg-slate-900/90 sm:flex">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <p className="text-sm font-medium text-white">Tasks</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close tasks"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <SessionTaskPanel tasks={tasks} partnerName={partnerName} tone="call" />
    </aside>
  );
}

export function SessionTaskSheet({
  tasks,
  partnerName,
  onClose,
}: {
  tasks: TasksState;
  partnerName: string | null;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[55%] flex-col rounded-t-2xl border border-white/10 bg-slate-900/95 shadow-2xl sm:hidden">
      <button
        type="button"
        onClick={onClose}
        className="flex justify-center py-2"
        aria-label="Close tasks"
      >
        <span className="h-1 w-10 rounded-full bg-white/30" />
      </button>
      <SessionTaskPanel tasks={tasks} partnerName={partnerName} tone="call" />
    </div>
  );
}
