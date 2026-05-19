import styles from "./friends.module.css";

interface Stat {
  label: string;
  value: number | string;
  unit?: string;
}

export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className={styles.statStrip}>
      {stats.map((s) => (
        <div key={s.label} className={styles.stat}>
          <div className={styles.statLbl}>{s.label}</div>
          <div className={styles.statVal}>
            {s.value}
            {s.unit ? <span className="unit">&nbsp;{s.unit}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
