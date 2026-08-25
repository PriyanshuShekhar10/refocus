import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import type { ReactNode } from "react";

const AVATARS = {
  maya: "/avatars/maya.jpg",
  you: "/avatars/you.jpg",
  priya: "/avatars/priya.jpg",
  tomas: "/avatars/tomas.jpg",
  lin: "/avatars/lin.jpg",
} as const;

function FocusModeVisual() {
  return (
    <div className={`${styles.modeVisual} ${styles.modeVisualPrimary}`}>
      <div className={styles.focusRoom}>
        <div className={styles.focusStatus} aria-live="polite">
          <span className={styles.focusStatusJoining}>Joining…</span>
          <span className={styles.focusStatusLive}>Focusing together</span>
        </div>
        <div className={styles.micRow}>
          <div className={`${styles.micCard} ${styles.micCardMuted}`}>
            <img
              className={styles.micAvatar}
              src={AVATARS.maya}
              alt=""
              width={36}
              height={36}
              decoding="async"
            />
            <div className={styles.micName}>Maya</div>
            <div className={styles.micTask}>
              <span className={styles.micTaskLabel}>Working on</span>
              Finish chapter 4
            </div>
            <div className={styles.micPill}>Mic optional</div>
          </div>
          <div className={`${styles.micCard} ${styles.micCardMuted}`}>
            <img
              className={styles.micAvatar}
              src={AVATARS.you}
              alt=""
              width={36}
              height={36}
              decoding="async"
            />
            <div className={styles.micName}>You</div>
            <div className={styles.micTask}>
              <span className={styles.micTaskLabel}>Working on</span>
              Revise notes
            </div>
            <div className={styles.micPill}>Mic optional</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncedTimersVisual() {
  return (
    <div className={`${styles.modeVisual} ${styles.modeVisualPrimary}`}>
      <div className={styles.timersPair}>
        <div className={styles.timersRow}>
          <div className={styles.timerUnit}>
            <div className={styles.timerCircle} aria-hidden="true">
              <svg className={styles.timerRing} viewBox="0 0 120 120">
                <circle className={styles.timerTrack} cx="60" cy="60" r="54" />
                <circle className={styles.timerProgress} cx="60" cy="60" r="54" />
              </svg>
              <span className={`${styles.timerTime} ${styles.mono}`}>32:14</span>
            </div>
            <span className={styles.timerWho}>Maya</span>
          </div>

          <div className={styles.timerSync} aria-hidden="true">
            <div className={styles.timerLink} />
            <span className={styles.timerSyncLabel}>Synced</span>
          </div>

          <div className={styles.timerUnit}>
            <div className={styles.timerCircle} aria-hidden="true">
              <svg className={styles.timerRing} viewBox="0 0 120 120">
                <circle className={styles.timerTrack} cx="60" cy="60" r="54" />
                <circle className={styles.timerProgress} cx="60" cy="60" r="54" />
              </svg>
              <span className={`${styles.timerTime} ${styles.mono}`}>32:14</span>
            </div>
            <span className={styles.timerWho}>You</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendsVisual() {
  return (
    <div className={`${styles.modeVisual} ${styles.modeVisualCompact}`}>
      <div className={styles.friendList}>
        <div className={styles.friendRow}>
          <img
            className={styles.friendAv}
            src={AVATARS.priya}
            alt=""
            width={24}
            height={24}
            decoding="async"
          />
          <span className={styles.friendLabel}>Priya K.</span>
          <span className={styles.friendStatus}>
            <span className={`${styles.friendDot} ${styles.friendDotBusy}`} />
            In session · 12m left
          </span>
        </div>

        <div className={styles.friendRow}>
          <img
            className={styles.friendAv}
            src={AVATARS.tomas}
            alt=""
            width={24}
            height={24}
            decoding="async"
          />
          <span className={styles.friendLabel}>Tomás</span>
          <span className={styles.friendStatus}>
            <span className={`${styles.friendDot} ${styles.friendDotFree}`} />
            Free now
          </span>
          <span className={styles.friendInvite}>Invite →</span>
        </div>

        <div className={`${styles.friendRow} ${styles.friendRowLin}`}>
          <img
            className={styles.friendAv}
            src={AVATARS.lin}
            alt=""
            width={24}
            height={24}
            decoding="async"
          />
          <span className={styles.friendLabel}>Lin</span>
          <span className={`${styles.friendStatus} ${styles.friendMetaSwap}`}>
            <span className={styles.friendMetaOffline}>
              <span className={`${styles.friendDot} ${styles.friendDotOffline}`} />
              Offline
            </span>
            <span className={styles.friendMetaOnline}>
              <span className={`${styles.friendDot} ${styles.friendDotFree}`} />
              Available
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function LoungeChatVisual() {
  return (
    <div className={`${styles.modeVisual} ${styles.modeVisualCompact}`}>
      <div className={styles.chatBubbles}>
        <div className={styles.bubble}>
          <span className={styles.bubbleWho}>Maya</span>
          Anyone up for a 50?
        </div>
        <div className={`${styles.bubble} ${styles.bubbleMe} ${styles.bubbleAppear}`}>
          <span className={styles.bubbleWho}>You</span>
          In. 5 min?
        </div>
        <div className={`${styles.bubble} ${styles.bubbleAppearLate}`}>
          <span className={styles.bubbleWho}>Maya</span>
          Yep.
        </div>
      </div>
    </div>
  );
}

type Mode = {
  title: string;
  body: string;
  visual: ReactNode;
  primary?: boolean;
};

const MODES: Mode[] = [
  {
    title: "Focus mode",
    body: "Say what you're working on, then get to work. Your partner stays there with you — conversation optional.",
    visual: <FocusModeVisual />,
    primary: true,
  },
  {
    title: "Synced timers",
    body: "Two clocks, one rhythm. Start together, break together, finish together.",
    visual: <SyncedTimersVisual />,
    primary: true,
  },
  {
    title: "Focus with friends",
    body: "Save the people you work well with and invite them directly to your next session.",
    visual: <FriendsVisual />,
  },
  {
    title: "Find someone to focus with",
    body: "Drop into the lounge, see who's around, and find a partner for your next session.",
    visual: <LoungeChatVisual />,
  },
];

export function Modes() {
  return (
    <section className={styles.block} id="how">
      <div className={styles.wrap}>
        <Reveal className={`${styles.sectionHead} ${styles.modesHead}`}>
          <span className={styles.eyebrow}>02 — The experience</span>
          <h2 className={`${styles.sectionTitle} ${styles.modesTitle}`}>
            Focus together.
            <br />
            Without meetings or noise.
          </h2>
          <p className={`${styles.sectionSub} ${styles.modesSub}`}>
            Quiet accountability without meetings, forced conversation, or
            productivity theatre.
          </p>
        </Reveal>

        <div className={styles.modes}>
          {MODES.map((m, i) => (
            <Reveal
              key={m.title}
              delayMs={i * 60}
              className={[
                styles.modeCard,
                m.primary ? styles.modeCardPrimary : styles.modeCardCompact,
              ].join(" ")}
            >
              <div className={styles.modeCopy}>
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
