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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <h2 className="text-sm font-semibold text-foreground">
        {title}
        {count !== undefined ? (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {count}
          </span>
        ) : null}
      </h2>
      {tools.length > 0 ? (
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onClick}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                t.active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
