/**
 * Pixel-matching “Preparing your session” chrome used for:
 * - SSR first paint on /sessions/[id] while ClientCall JS loads
 * - ClientCall’s own loading phase (must match SSR to avoid CLS)
 */
export function PreparingSessionShell() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF1D3]/50 via-white to-slate-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative w-full max-w-md overflow-visible rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#5D1C6A] dark:border-slate-700 dark:border-t-[#CA5995]" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Preparing your session
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Connecting you to the call…
        </p>
      </div>
    </div>
  );
}
