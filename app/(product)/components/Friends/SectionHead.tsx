interface SectionHeadProps {
  title: string;
  count?: number;
  tools?: Array<{ label: string; active?: boolean; onClick?: () => void }>;
}

export default function SectionHead({
  title,
  count,
  tools = [],
}: SectionHeadProps) {
  return (
    <div
      className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b pb-3"
      style={{ borderColor: "var(--line-soft)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        {title}
        {count !== undefined ? (
          <span
            className="ml-2 text-sm font-normal"
            style={{ color: "var(--ink-mute)" }}
          >
            {count}
          </span>
        ) : null}
      </h2>
      {tools.length > 0 ? (
        <div
          className="flex gap-1 rounded-lg p-1"
          style={{ background: "var(--line-soft)" }}
        >
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onClick}
              className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
              style={
                t.active
                  ? {
                      background: "var(--card)",
                      color: "var(--ink)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }
                  : { color: "var(--ink-mute)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
