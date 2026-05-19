import { CSSProperties } from "react";
import styles from "./friends.module.css";

export type AvatarTint =
  | "sage"
  | "blush"
  | "butter"
  | "lavender"
  | "clay"
  | "sky";

export type Presence = "online" | "busy" | "offline";

export function tintForKey(key: string): AvatarTint {
  const tints: AvatarTint[] = [
    "sage",
    "blush",
    "butter",
    "lavender",
    "clay",
    "sky",
  ];
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return tints[Math.abs(h) % tints.length];
}

const tintClass: Record<AvatarTint, string> = {
  sage: styles.avSage,
  blush: styles.avBlush,
  butter: styles.avButter,
  lavender: styles.avLavender,
  clay: styles.avClay,
  sky: styles.avSky,
};

interface AvatarProps {
  initial: string;
  tint: AvatarTint;
  size?: "md" | "sm";
  presence?: Presence;
  style?: CSSProperties;
  title?: string;
}

export default function Avatar({
  initial,
  tint,
  size = "md",
  presence,
  style,
  title,
}: AvatarProps) {
  const classes = [styles.av, tintClass[tint]];
  if (size === "sm") classes.push(styles.avSm);
  return (
    <span
      className={classes.join(" ")}
      style={style}
      aria-hidden={title ? undefined : true}
      title={title}
    >
      {initial.toUpperCase()}
      {presence ? (
        <span
          className={`${styles.dot} ${
            presence === "online"
              ? styles.dotOnline
              : presence === "busy"
                ? styles.dotBusy
                : ""
          }`}
        />
      ) : null}
    </span>
  );
}
