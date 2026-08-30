"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { playUpdateDismissCrunch } from "@/lib/updateDismissSound";

export type UpdateItem = {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  createdByName: string | null;
  dismissed?: boolean;
};

type UpdatesResponse = {
  updates: UpdateItem[];
  isAdmin?: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error("Failed to load updates");
    return res.json() as Promise<UpdatesResponse>;
  });

const FRAGMENT_COLORS = [
  "#FFF1D3",
  "#FFD166",
  "#FFB090",
  "#CA5995",
  "#5D1C6A",
  "#E8DCC8",
];

const STACK_PEEK = 10;
const MAX_VISIBLE = 3;

type Fragment = {
  id: number;
  left: number;
  top: number;
  size: number;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
  color: string;
};

type StackLayer = {
  y: number;
  scale: number;
  opacity: number;
  insetX: number;
};

const STACK_LAYERS: StackLayer[] = [
  { y: 0, scale: 1, opacity: 1, insetX: 0 },
  { y: -STACK_PEEK, scale: 0.96, opacity: 0.94, insetX: 6 },
  { y: -STACK_PEEK * 2, scale: 0.92, opacity: 0.88, insetX: 12 },
];

function buildFragments(seed: string): Fragment[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const rand = (n: number) => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return ((hash % 1000) / 1000) * n;
  };

  const cols = 10;
  const rows = 6;
  const fragments: Fragment[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const id = row * cols + col;
      fragments.push({
        id,
        left: (col / cols) * 100 + rand(4),
        top: (row / rows) * 100 + rand(3),
        size: 5 + rand(5),
        dx: (rand(1) - 0.5) * 90,
        dy: -18 - rand(72),
        rotate: (rand(1) - 0.5) * 220,
        delay: rand(0.07),
        color: FRAGMENT_COLORS[id % FRAGMENT_COLORS.length],
      });
    }
  }

  return fragments;
}

function getVisibleQueue(
  updates: UpdateItem[],
  isAdmin: boolean,
  skipIds: ReadonlySet<string>,
): UpdateItem[] {
  const queue = updates.filter((item) => !skipIds.has(item.id));
  if (queue.length === 0) return [];
  if (isAdmin) {
    return queue.filter((item) => !item.dismissed);
  }
  return queue;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationCard({
  update,
  stackIndex,
  isFront,
  busy,
  disintegrating,
  fragments,
  prefersReducedMotion,
  onDismiss,
}: {
  update: UpdateItem;
  stackIndex: number;
  isFront: boolean;
  busy: boolean;
  disintegrating: boolean;
  fragments: Fragment[];
  prefersReducedMotion: boolean;
  onDismiss: () => void;
}) {
  const layer = STACK_LAYERS[stackIndex] ?? STACK_LAYERS[STACK_LAYERS.length - 1];
  const showDisintegration = isFront && disintegrating && !prefersReducedMotion;

  return (
    <motion.div
      layout={isFront ? "position" : false}
      initial={
        prefersReducedMotion
          ? false
          : { opacity: 0, y: layer.y + 12, scale: layer.scale * 0.98 }
      }
      animate={{
        opacity: showDisintegration ? 0 : layer.opacity,
        y: layer.y,
        scale: showDisintegration ? layer.scale * 0.94 : layer.scale,
        filter:
          showDisintegration && !prefersReducedMotion
            ? "blur(10px)"
            : "blur(0px)",
      }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: layer.scale * 0.9, y: layer.y - 8 }
      }
      transition={
        showDisintegration && !prefersReducedMotion
          ? { duration: 0.52, ease: [0.4, 0, 0.2, 1] }
          : { type: "spring", stiffness: 420, damping: 32 }
      }
      style={{
        zIndex: MAX_VISIBLE - stackIndex,
        left: layer.insetX,
        right: layer.insetX,
      }}
      className={`absolute inset-x-0 top-0 overflow-hidden rounded-[18px] border border-black/[0.06] bg-white/92 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_24px_-6px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#1c1c1e]/92 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-6px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.35)] ${
        showDisintegration ? "overflow-visible" : ""
      } ${update.dismissed ? "opacity-80" : ""}`}
    >
      {showDisintegration ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          {fragments.map((fragment) => (
            <motion.span
              key={fragment.id}
              className="absolute rounded-[1px] shadow-sm"
              style={{
                left: `${fragment.left}%`,
                top: `${fragment.top}%`,
                width: fragment.size,
                height: fragment.size,
                backgroundColor: fragment.color,
              }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: fragment.dx,
                y: fragment.dy,
                scale: [1, 0.85, 0],
                rotate: fragment.rotate,
              }}
              transition={{
                duration: 0.52,
                ease: [0.22, 1, 0.36, 1],
                delay: fragment.delay,
                times: [0, 0.35, 1],
              }}
            />
          ))}
        </div>
      ) : null}

      <motion.div
        animate={
          showDisintegration
            ? { opacity: 0, scale: 0.96 }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.12 }}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#5D1C6A] to-[#CA5995] shadow-sm">
            <Megaphone className="h-4 w-4 text-white" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-gray-900 dark:text-white">
                  {update.title || "Refocus"}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  now · {formatTime(update.createdAt)}
                </p>
              </div>
              {isFront ? (
                <motion.button
                  type="button"
                  aria-label="Dismiss update"
                  disabled={busy}
                  onClick={onDismiss}
                  whileHover={
                    prefersReducedMotion ? undefined : { scale: 1.08 }
                  }
                  whileTap={
                    prefersReducedMotion ? undefined : { scale: 0.9 }
                  }
                  className="shrink-0 rounded-full bg-black/[0.06] p-1 text-gray-500 transition-colors hover:bg-black/[0.1] hover:text-gray-700 disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.14] dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              ) : null}
            </div>

            <p
              className={`mt-1.5 text-[12px] leading-snug text-gray-700 dark:text-gray-200 ${
                isFront ? "whitespace-pre-wrap" : "line-clamp-1"
              }`}
            >
              {update.body}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SidebarUpdatesBox() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { data, mutate } = useSWR("/api/updates", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  });

  const isAdmin = Boolean(data?.isAdmin);
  const updates = data?.updates ?? [];
  const skippedIdsRef = useRef(new Set<string>());
  const [, bumpSkipVersion] = useState(0);

  const queue = getVisibleQueue(updates, isAdmin, skippedIdsRef.current);

  const [busy, setBusy] = useState(false);
  const [disintegrating, setDisintegrating] = useState(false);
  const [exitUpdate, setExitUpdate] = useState<UpdateItem | null>(null);

  const frontUpdate = exitUpdate ?? queue[0] ?? null;
  const stackBehind = queue
    .filter((item) => item.id !== frontUpdate?.id)
    .slice(0, MAX_VISIBLE - 1);
  const visibleStack = frontUpdate
    ? [frontUpdate, ...stackBehind]
    : [];
  const hiddenCount = Math.max(0, queue.length - visibleStack.length);

  const fragments = useMemo(
    () => (frontUpdate ? buildFragments(frontUpdate.id) : []),
    [frontUpdate],
  );

  const dismiss = useCallback(async () => {
    if (!frontUpdate || busy) return;
    const dismissing = frontUpdate;
    setBusy(true);
    setExitUpdate(dismissing);

    if (!prefersReducedMotion) {
      playUpdateDismissCrunch();
      setDisintegrating(true);
    }

    try {
      const res = await fetch(`/api/updates/${dismissing.id}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Dismiss failed");

      skippedIdsRef.current.add(dismissing.id);
      bumpSkipVersion((version) => version + 1);

      const delay = prefersReducedMotion ? 0 : 560;
      window.setTimeout(() => {
        void mutate(
          (current) => {
            if (!current) return current;
            return {
              ...current,
              updates: current.updates.filter(
                (item) => item.id !== dismissing.id,
              ),
            };
          },
          { revalidate: false },
        );
        setExitUpdate(null);
        setBusy(false);
        setDisintegrating(false);
      }, delay);
    } catch {
      setExitUpdate(null);
      setBusy(false);
      setDisintegrating(false);
    }
  }, [busy, frontUpdate, mutate, prefersReducedMotion]);

  if (visibleStack.length === 0) return null;

  const stackHeight =
    88 + Math.max(0, visibleStack.length - 1) * STACK_PEEK;

  return (
    <div className="relative mt-2 shrink-0">
      <div
        className="relative"
        style={{
          height: stackHeight,
          paddingTop: Math.max(0, visibleStack.length - 1) * STACK_PEEK,
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleStack
            .slice()
            .reverse()
            .map((update) => {
              const stackIndex = visibleStack.findIndex(
                (item) => item.id === update.id,
              );
              const isFront = stackIndex === 0;

              return (
                <NotificationCard
                  key={update.id}
                  update={update}
                  stackIndex={stackIndex}
                  isFront={isFront}
                  busy={busy}
                  disintegrating={disintegrating && isFront}
                  fragments={fragments}
                  prefersReducedMotion={prefersReducedMotion}
                  onDismiss={() => void dismiss()}
                />
              );
            })}
        </AnimatePresence>
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-1.5 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
          {hiddenCount} more update{hiddenCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

export function useUnreadUpdatesCount() {
  const { data } = useSWR("/api/updates", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  });
  const updates = data?.updates ?? [];
  if (data?.isAdmin) {
    return updates.filter((item) => !item.dismissed).length;
  }
  return updates.length;
}
