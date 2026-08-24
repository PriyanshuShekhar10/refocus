import { useState, type KeyboardEvent } from "react";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";
import { url } from "../../lib/config";

type Length = {
  minutes: 25 | 50 | 75;
  name: string;
  desc: string;
  recommended?: boolean;
};

const LENGTHS: Length[] = [
  {
    minutes: 25,
    name: "Sprint",
    desc: "Quick tasks & planning.",
  },
  {
    minutes: 50,
    name: "Deep Work",
    desc: "The sweet spot for focused work.",
    recommended: true,
  },
  {
    minutes: 75,
    name: "Marathon",
    desc: "Writing, research & heavy projects.",
  },
];

function CheckIcon() {
  return (
    <svg
      className={styles.lcCheck}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 7.2 5.4 10l6.1-6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sessions() {
  const [selected, setSelected] = useState<25 | 50 | 75>(50);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = LENGTHS.findIndex((l) => l.minutes === selected);
    if (idx < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(LENGTHS[(idx + 1) % LENGTHS.length].minutes);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(LENGTHS[(idx - 1 + LENGTHS.length) % LENGTHS.length].minutes);
    }
  };

  return (
    <section className={`${styles.block} ${styles.blockSurface}`} id="sessions">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>01 — Sessions</span>
          <h2 className={styles.sectionTitle}>Choose your focus time.</h2>
          <p className={styles.sectionSub}>
            Pick a session length that matches the work in front of you.
          </p>
        </Reveal>

        <div
          className={styles.lengths}
          role="radiogroup"
          aria-label="Session length"
          onKeyDown={onKeyDown}
        >
          {LENGTHS.map((l, i) => {
            const isSelected = selected === l.minutes;
            return (
              <Reveal
                key={l.minutes}
                delayMs={i * 70}
                className={styles.lengthCell}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`${styles.lengthCard} ${
                    isSelected ? styles.lengthCardSelected : ""
                  }`}
                  onClick={() => setSelected(l.minutes)}
                >
                  <div className={styles.lcTop}>
                    {l.recommended ? (
                      <span className={styles.lcBadge}>Recommended</span>
                    ) : (
                      <span className={styles.lcBadgeSpacer} aria-hidden="true" />
                    )}
                    {isSelected ? (
                      <span className={styles.lcSelectedMark}>
                        <CheckIcon />
                        Selected
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.lcTime}>
                    {l.minutes}
                    <span className={styles.lcUnit}>min</span>
                  </div>
                  <div className={styles.lcName}>{l.name}</div>
                  <div className={styles.lcDesc}>{l.desc}</div>
                </button>
              </Reveal>
            );
          })}
        </div>

        <Reveal className={styles.sessionAction} delayMs={180}>
          <div className={styles.sessionActionCopy}>
            <p className={styles.sessionActionStatus}>
              {selected} min selected
            </p>
            <p className={styles.sessionActionHint}>
              Your partner&apos;s timer will sync automatically.
            </p>
          </div>
          <a
            href={url(`/auth/sign-up?duration=${selected}`)}
            className={`${styles.btn} ${styles.btnBrand} ${styles.btnLg}`}
          >
            Start a {selected} min session
            <ArrowIcon />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
