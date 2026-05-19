import styles from "./friends.module.css";

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
    <div className={styles.sectionHead}>
      <h2>
        {title}
        {count !== undefined ? (
          <span className={styles.count}>{count}</span>
        ) : null}
      </h2>
      {tools.length > 0 ? (
        <div className={styles.tools}>
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              className={t.active ? styles.on : ""}
              onClick={t.onClick}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
