import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

function FocusModeVisual() {
  return (
    <div className={styles.modeVisual}>
      <div className={styles.micRow}>
        <div className={`${styles.micCard} ${styles.micCardMuted}`}>
          <div className={styles.micAvatar} />
          <div className={styles.micName}>Maya</div>
          <div className={styles.micPill}>Mic optional</div>
        </div>
        <div className={`${styles.micCard} ${styles.micCardMuted}`}>
          <div className={styles.micAvatar} />
          <div className={styles.micName}>You</div>
          <div className={styles.micPill}>Mic optional</div>
        </div>
      </div>
    </div>
  );
}

function SyncedTimersVisual() {
  return (
    <div className={styles.modeVisual}>
      <div className={styles.timersRow}>
        <div className={`${styles.timerCircle} ${styles.mono}`}>32:14</div>
        <div className={styles.timerLink} />
        <div className={`${styles.timerCircle} ${styles.mono}`}>32:14</div>
      </div>
    </div>
  );
}

function FriendsVisual() {
  return (
    <div className={styles.modeVisual}>
      <div className={styles.friendList}>
        <div className={styles.friendRow}>
          <div className={styles.friendAv} />
          <span className={styles.friendLabel}>Priya K.</span>
          <span className={styles.friendStatus} title="online" />
          <span className={styles.friendMeta}>in session · 12m left</span>
        </div>
        <div className={styles.friendRow}>
          <div className={styles.friendAv} />
          <span className={styles.friendLabel}>Tomás</span>
          <span className={styles.friendStatus} />
          <span className={styles.friendMeta}>free now</span>
        </div>
        <div className={styles.friendRow}>
          <div className={styles.friendAv} />
          <span className={styles.friendLabel}>Lin</span>
          <span className={styles.friendMetaText}>offline</span>
        </div>
      </div>
    </div>
  );
}

function GlobalChatVisual() {
  return (
    <div className={styles.modeVisual}>
      <div className={styles.chatBubbles}>
        <div className={styles.bubble}>
          <span className={styles.bubbleWho}>Maya</span>Anyone up for a 50?
        </div>
        <div className={`${styles.bubble} ${styles.bubbleMe}`}>
          <span className={styles.bubbleWho}>You</span>In. 5 min?
        </div>
        <div className={styles.bubble}>
          <span className={styles.bubbleWho}>Maya</span>Done.
        </div>
      </div>
    </div>
  );
}

type Mode = {
  title: string;
  body: string;
  visual: React.ReactNode;
};

const MODES: Mode[] = [
  {
    title: "Focus mode",
    body: "Designed for accountability. Share your plan, keep working while someone else is there with you, and use mic only when needed.",
    visual: <FocusModeVisual />,
  },
  {
    title: "Synced timers",
    body: "Two clocks, one rhythm. When your partner starts, you start. Breaks land together.",
    visual: <SyncedTimersVisual />,
  },
  {
    title: "Friends & session requests",
    body: "Add the people you actually focus well with. Send a session request — they'll see it on their dashboard.",
    visual: <FriendsVisual />,
  },
  {
    title: "Global chat",
    body: "Between sessions, drop into the lounge. Say hi, find a partner for the next slot, or just lurk.",
    visual: <GlobalChatVisual />,
  },
];

export function Modes() {
  return (
    <section className={styles.block} id="how">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>02 — Modes</span>
          <h2 className={styles.sectionTitle}>
            Co-work that gets out of the way.
          </h2>
          <p className={styles.sectionSub}>
            Four ways to share a room, all built around accountability and real
            progress, not meeting fatigue.
          </p>
        </Reveal>

        <div className={styles.modes}>
          {MODES.map((m, i) => (
            <Reveal
              key={m.title}
              delayMs={i * 60}
              className={styles.modeCard}
            >
              <div>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
              </div>
              {m.visual}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
