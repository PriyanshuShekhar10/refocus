"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type IssueStatus = "todo" | "in_progress" | "done";
type IssuePriority = "low" | "medium" | "high";

type BacklogIssue = {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLUMNS: Array<{ key: IssueStatus; title: string; emptyText: string }> = [
  { key: "todo", title: "Todo", emptyText: "No issues yet." },
  { key: "in_progress", title: "Working on it", emptyText: "Nothing in progress." },
  { key: "done", title: "Done", emptyText: "No completed issues yet." },
];

const PRIORITY_STYLES: Record<IssuePriority, string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  high: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export default function BacklogBoard() {
  const [issues, setIssues] = useState<BacklogIssue[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issuesByStatus = useMemo(() => {
    return {
      todo: issues.filter((issue) => issue.status === "todo"),
      in_progress: issues.filter((issue) => issue.status === "in_progress"),
      done: issues.filter((issue) => issue.status === "done"),
    };
  }, [issues]);

  useEffect(() => {
    const loadIssues = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/backlog/issues");
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || "Failed to fetch backlog issues");
        }
        const data = await res.json();
        setIssues((data.issues || []) as BacklogIssue[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load backlog");
      } finally {
        setLoading(false);
      }
    };

    loadIssues();
  }, []);

  const handleCreateIssue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/backlog/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to create issue");
      }

      setIssues((prev) => [payload.issue as BacklogIssue, ...prev]);
      setTitle("");
      setDescription("");
      setPriority("medium");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  const updateIssueStatus = async (issueId: string, status: IssueStatus) => {
    const previousIssues = issues;
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? { ...issue, status, updatedAt: new Date().toISOString() }
          : issue,
      ),
    );

    try {
      const res = await fetch(`/api/backlog/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update issue");
      }
      if (payload?.issue) {
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === issueId ? (payload.issue as BacklogIssue) : issue,
          ),
        );
      }
    } catch (err) {
      setIssues(previousIssues);
      setError(err instanceof Error ? err.message : "Unable to update issue");
    }
  };

  const deleteIssue = async (issueId: string) => {
    const previousIssues = issues;
    setIssues((prev) => prev.filter((issue) => issue.id !== issueId));

    try {
      const res = await fetch(`/api/backlog/issues/${issueId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to delete issue");
      }
    } catch (err) {
      setIssues(previousIssues);
      setError(err instanceof Error ? err.message : "Unable to delete issue");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Backlog Board
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track priorities and move issues as you start and finish work.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Add an issue
          </h2>
          <form onSubmit={handleCreateIssue} className="mt-3 grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label htmlFor="issue-title" className="sr-only">
                Issue title
              </label>
              <input
                id="issue-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Issue title"
                maxLength={120}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#CA5995] focus:ring-2 focus:ring-[#CA5995]/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                required
              />
            </div>

            <div className="md:col-span-4">
              <label htmlFor="issue-description" className="sr-only">
                Issue description
              </label>
              <input
                id="issue-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#CA5995] focus:ring-2 focus:ring-[#CA5995]/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="issue-priority" className="sr-only">
                Priority
              </label>
              <select
                id="issue-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as IssuePriority)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#CA5995] focus:ring-2 focus:ring-[#CA5995]/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-[#5D1C6A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#CA5995] disabled:cursor-not-allowed disabled:opacity-60 md:col-span-1"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </form>
        </section>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            Loading backlog issues...
          </div>
        ) : (
          <section className="grid gap-4 xl:grid-cols-3">
            {STATUS_COLUMNS.map((column) => {
              const columnIssues = issuesByStatus[column.key];
              return (
                <div
                  key={column.key}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {column.title}
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {columnIssues.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnIssues.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        {column.emptyText}
                      </p>
                    ) : (
                      columnIssues.map((issue) => (
                        <article
                          key={issue.id}
                          className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {issue.title}
                            </h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[issue.priority]}`}
                            >
                              {issue.priority}
                            </span>
                          </div>

                          {issue.description ? (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                              {issue.description}
                            </p>
                          ) : null}

                          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                            Updated {new Date(issue.updatedAt).toLocaleString()}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {issue.status === "todo" && (
                              <button
                                type="button"
                                onClick={() => updateIssueStatus(issue.id, "in_progress")}
                                className="rounded-md border border-[#5D1C6A]/30 px-2.5 py-1 text-xs font-semibold text-[#5D1C6A] transition hover:bg-[#5D1C6A] hover:text-white dark:border-[#CA5995]/50 dark:text-[#FFB090]"
                              >
                                Start working
                              </button>
                            )}

                            {issue.status === "in_progress" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateIssueStatus(issue.id, "todo")}
                                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                  Move to todo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateIssueStatus(issue.id, "done")}
                                  className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                                >
                                  Mark done
                                </button>
                              </>
                            )}

                            {issue.status === "done" && (
                              <button
                                type="button"
                                onClick={() => updateIssueStatus(issue.id, "in_progress")}
                                className="rounded-md border border-[#5D1C6A]/30 px-2.5 py-1 text-xs font-semibold text-[#5D1C6A] transition hover:bg-[#5D1C6A] hover:text-white dark:border-[#CA5995]/50 dark:text-[#FFB090]"
                              >
                                Reopen
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => deleteIssue(issue.id)}
                              className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-900/30"
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
