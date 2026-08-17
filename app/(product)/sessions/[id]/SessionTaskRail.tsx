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
    label: string;
    count: string;
    item: string;
    itemDone: string;
    mute: string;
    check: string;
    checkOn: string;
    input: string;
    deleteBtn: string;
    focus: string;
    divider: string;
  }
> = {
  call: {
    label: "text-slate-500",
    count: "text-slate-500",
    item: "text-slate-200",
    itemDone: "text-slate-500 line-through decoration-slate-600/80",
    mute: "text-slate-500",
    check: "border-white/20",
    checkOn: "border-[#CA5995]/70 text-[#CA5995]",
    input:
      "border-white/10 bg-transparent text-slate-200 placeholder:text-slate-600 focus:border-white/25",
    deleteBtn: "text-slate-600 hover:text-slate-300",
    focus: "focus-visible:ring-1 focus-visible:ring-white/35",
    divider: "border-white/10",
  },
  page: {
    label: "text-gray-400 dark:text-gray-500",
    count: "text-gray-400 dark:text-gray-500",
    item: "text-gray-800 dark:text-gray-100",
    itemDone: "text-gray-400 line-through decoration-gray-300 dark:text-gray-500",
    mute: "text-gray-400 dark:text-gray-500",
    check: "border-gray-300 dark:border-gray-600",
    checkOn: "border-[#5D1C6A]/70 text-[#5D1C6A] dark:border-[#CA5995]/70 dark:text-[#CA5995]",
    input:
      "border-gray-200 bg-transparent text-gray-900 placeholder:text-gray-400 focus:border-gray-400 dark:border-white/10 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/25",
    deleteBtn: "text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300",
    focus: "focus-visible:ring-1 focus-visible:ring-gray-400/50 dark:focus-visible:ring-white/30",
    divider: "border-gray-100 dark:border-white/10",
  },
};

function CheckMark({
  done,
  tone,
}: {
  done: boolean;
  tone: Tone;
}) {
  const t = tones[tone];
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
        done ? t.checkOn : t.check
      }`}
    >
      {done ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
    </span>
  );
}

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
  const title = (
    <span
      className={`min-w-0 flex-1 break-words text-[13px] leading-5 transition-opacity duration-300 ${
        task.done ? t.itemDone : highlighted ? `${t.item} opacity-100` : t.item
      }`}
    >
      {task.title}
    </span>
  );

  return (
    <li
      className={`group flex items-start gap-2.5 py-1.5 transition-opacity duration-300 ${
        highlighted ? "opacity-100" : ""
      }`}
    >
      {editable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={
            task.done
              ? `Mark “${task.title}” incomplete`
              : `Mark “${task.title}” complete`
          }
          onClick={() => onToggle(!task.done)}
          className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-sm text-left ${t.focus}`}
        >
          <CheckMark done={task.done} tone={tone} />
          {title}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <CheckMark done={task.done} tone={tone} />
          {title}
        </div>
      )}
      {editable ? (
        <button
          type="button"
          aria-label={`Remove “${task.title}”`}
          onClick={onDelete}
          className={`mt-0.5 rounded-sm p-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 ${t.deleteBtn} ${t.focus}`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
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
        name="task-title"
        autoComplete="off"
        aria-label="Add a task"
        value={value}
        maxLength={SESSION_TASK_TITLE_MAX}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task…"
        className={`w-full border-b px-0 py-1.5 text-[13px] outline-none disabled:opacity-40 ${t.input} ${t.focus}`}
      />
    </form>
  );
}

function SectionLabel({
  label,
  done,
  total,
  tone,
}: {
  label: string;
  done: number;
  total: number;
  tone: Tone;
}) {
  const t = tones[tone];
  return (
    <div className="mb-1 flex items-baseline justify-between gap-3">
      <h3 className={`text-[11px] font-medium ${t.label}`}>{label}</h3>
      {total > 0 ? (
        <span className={`text-[11px] tabular-nums ${t.count}`}>
          {done}/{total}
        </span>
      ) : null}
    </div>
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
    youProgress,
    partnerProgress,
    loading,
    error,
    highlightedIds,
    addTask,
    toggleTask,
    deleteTask,
    canAdd,
  } = tasks;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-3">
      <section>
        <SectionLabel
          label="You"
          done={youProgress.done}
          total={youProgress.total}
          tone={tone}
        />
        {loading && yours.length === 0 ? (
          <p className={`mt-2 text-[13px] ${t.mute}`}>Loading…</p>
        ) : yours.length === 0 ? (
          <p className={`mt-1 text-[13px] ${t.mute}`}>Nothing yet</p>
        ) : (
          <ul>
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
        <div className={yours.length > 0 ? "mt-0.5 pl-6" : "mt-1"}>
          <TaskComposer
            tone={tone}
            disabled={!canAdd}
            onAdd={(title) => void addTask(title)}
          />
        </div>
      </section>

      <section className={`border-t pt-5 ${t.divider}`}>
        <SectionLabel
          label={first || "Partner"}
          done={partnerProgress.done}
          total={partnerProgress.total}
          tone={tone}
        />
        {partnerTasks.length === 0 ? (
          <p className={`mt-1 text-[13px] ${t.mute}`}>Nothing yet</p>
        ) : (
          <ul>
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
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
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
    partnerTotal > 0 && first ? ` · ${first} ${partnerDone}/${partnerTotal}` : "";
  const summary = `Tasks ${youDone}/${youTotal}${partnerLabel}`;

  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label={open ? `Hide ${summary}` : `Show ${summary}`}
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium tabular-nums backdrop-blur-sm transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-white/35 ${
        open
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">Tasks</span>
      <span>
        {youDone}/{youTotal}
      </span>
      {partnerLabel ? (
        <span className="hidden text-slate-400 sm:inline">{partnerLabel}</span>
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
    <aside className="hidden h-full w-[240px] shrink-0 flex-col border-l border-white/10 bg-slate-950/70 backdrop-blur-md sm:flex">
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-[11px] font-medium text-slate-500">Tasks</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-0.5 text-slate-500 transition-colors duration-150 hover:text-slate-200 focus-visible:ring-1 focus-visible:ring-white/35"
          aria-label="Hide tasks"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
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
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[55%] flex-col rounded-t-2xl border-t border-white/10 bg-slate-950/90 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md sm:hidden">
      <button
        type="button"
        onClick={onClose}
        className="flex justify-center py-2.5 focus-visible:ring-1 focus-visible:ring-white/35"
        aria-label="Hide tasks"
      >
        <span className="h-1 w-8 rounded-full bg-white/20" />
      </button>
      <SessionTaskPanel tasks={tasks} partnerName={partnerName} tone="call" />
    </div>
  );
}
