import { useEffect, useState } from "react";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";
import { url } from "../../lib/config";

export type HeroImage = {
  avifSrcset: string;
  webpSrcset: string;
  fallbackSrc: string;
  fallbackSrcset?: string;
  sizes: string;
  width: number;
  height: number;
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useTaskList(initial: boolean[]) {
  const [done, setDone] = useState(initial);
  const toggle = (i: number) =>
    setDone((prev) => prev.map((d, k) => (k === i ? !d : d)));
  return { done, toggle };
}

const LIN_LABELS = [
  "read chapter 4",
  "highlight key terms",
  "write a one-page summary",
];
const MAYA_LABELS = [
  "outline the essay",
  "draft the intro paragraph",
  "find 3 sources",
];

function TaskList({
  who,
  labels,
  done,
  toggle,
}: {
  who: string;
  labels: string[];
  done: boolean[];
  toggle: (i: number) => void;
}) {
  const doneCount = done.filter(Boolean).length;
  return (
    <>
      <div className={styles.taskCardHead}>
        <span className={styles.taskCardWho}>{who} is working on…</span>
        <span className={styles.taskCardCount}>{doneCount} of 3</span>
      </div>
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => toggle(i)}
          className={`${styles.taskRow} ${done[i] ? styles.taskRowDone : ""}`}
        >
          <span
            className={`${styles.taskBox} ${done[i] ? styles.taskBoxDone : ""}`}
          >
            {done[i] ? "✓" : ""}
          </span>
          {label}
        </button>
      ))}
    </>
  );
}

export function Hero({ image }: { image?: HeroImage }) {
  const lin = useTaskList([true, true, false]);
  const maya = useTaskList([true, false, false]);
  const [live, setLive] = useState(1934);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setLive((s) => (s > 0 ? s - 1 : 3000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const linCurrent = LIN_LABELS[lin.done.findIndex((d) => !d)] ?? LIN_LABELS[2];
  const mayaCurrent =
    MAYA_LABELS[maya.done.findIndex((d) => !d)] ?? MAYA_LABELS[2];

  return (
    <section className={styles.hero}>
      <div className={styles.heroTop}>
      <div className={`${styles.wrap} ${styles.heroGrid}`}>
        <div>
          <img
            src="/logo.svg"
            alt="Refocus"
            className={styles.heroLogo}
          />
          <Reveal as="span" className={styles.eyebrow}>
            virtual coworking
          </Reveal>

          <Reveal as="h1" className={styles.heroTitle}>
            work alongside someone.
          </Reveal>

          <Reveal as="p" className={styles.heroSub}>
            refocus pairs you with a real person for a quiet, focused work
            session.
          </Reveal>

          <Reveal className={styles.heroCtaRow}>
            <a
              href={url("/auth/sign-up")}
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
            >
              start
              <ArrowIcon />
            </a>
            <span className={styles.freeSticker}>free for early members</span>
          </Reveal>

          <Reveal as="p" className={styles.heroFoot}>
            no card required
          </Reveal>
        </div>

        <Reveal className={styles.heroVisual}>
          <div className={`${styles.heroShot} ${styles.heroShotLin}`}>
            <img
              src="/study-lin.gif"
              alt="Lin studying on a video call"
              className={styles.heroShotImg}
            />
            <span className={styles.heroShotTag}>lin</span>
          </div>
          <div className={`${styles.heroShot} ${styles.heroShotMaya}`}>
            <img
              src="/study-maya.gif"
              alt="Maya studying on a video call"
              className={styles.heroShotImg}
            />
            <span className={styles.heroShotTag}>maya</span>
          </div>

          {!isMobile ? (
            <>
              <span className={styles.heroLivePill}>
                <span className={styles.heroLiveDigits}>{fmt(live)}</span>
                focusing together
              </span>
              <div className={`${styles.taskCard} ${styles.taskCardLin}`}>
                <TaskList
                  who="lin"
                  labels={LIN_LABELS}
                  done={lin.done}
                  toggle={lin.toggle}
                />
              </div>
              <div className={`${styles.taskCard} ${styles.taskCardMaya}`}>
                <TaskList
                  who="maya"
                  labels={MAYA_LABELS}
                  done={maya.done}
                  toggle={maya.toggle}
                />
              </div>
            </>
          ) : (
            <>
              <div
                className={`${styles.mobileTaskCard} ${styles.mobileTaskLin}`}
              >
                <span className={styles.mobileTaskDot} />
                <span>{linCurrent}</span>
              </div>
              <div
                className={`${styles.mobileTaskCard} ${styles.mobileTaskMaya}`}
              >
                <span className={styles.mobileTaskDot} />
                <span>{mayaCurrent}</span>
              </div>
            </>
          )}
        </Reveal>
      </div>
      </div>

      <div className={styles.dashboardBlock}>
        <div className={styles.wrap}>
          <div className={styles.winCard}>
            <div className={styles.winTitlebar}>
              <span className={styles.winDot} />
              <span className={styles.winDot} />
              <span className={styles.winLabel}>refocus · dashboard</span>
            </div>
            {image ? (
              <picture>
                <source
                  type="image/avif"
                  srcSet={image.avifSrcset}
                  sizes={image.sizes}
                />
                <source
                  type="image/webp"
                  srcSet={image.webpSrcset}
                  sizes={image.sizes}
                />
                <img
                  src={image.fallbackSrc}
                  srcSet={image.fallbackSrcset}
                  sizes={image.sizes}
                  alt="Refocus dashboard showing the session calendar, attendance and next session"
                  className={styles.dashboardImg}
                  width={image.width}
                  height={image.height}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
            ) : (
              <img
                src="/dashboard-real.png"
                alt="Refocus dashboard showing the session calendar, attendance and next session"
                className={styles.dashboardImg}
                loading="eager"
                decoding="async"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
