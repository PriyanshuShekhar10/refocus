import { ReactNode } from "react";
import styles from "./friends.module.css";

interface EmptyCardProps {
  label: string;
  sub?: ReactNode;
}

export default function EmptyCard({ label, sub }: EmptyCardProps) {
  return (
    <div className={styles.reqEmpty}>
      <div className={styles.label}>{label}</div>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
    </div>
  );
}
