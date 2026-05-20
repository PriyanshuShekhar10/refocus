import Link from "next/link";
import Image from "next/image";
import { HeroImage } from "@/assets/exports";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";
import { ArrowIcon } from "./ArrowIcon";

const AVATAR_COLORS = ["#FFF1D3", "#FFB090", "#CA5995", "#5D1C6A"];

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <div className={styles.heroRow}>
          <div className={styles.heroCopy}>
            <Reveal as="h1" className={styles.heroTitle}>
              Focus.
              <br />
              Co-work.
              <br />
              <em>Together.</em>
            </Reveal>

            <Reveal as="p" className={styles.heroSub}>
              25/50/75 mins - Goals - Accountability
            </Reveal>

            <Reveal className={styles.heroCta}>
              <Link
                href="/auth/sign-up"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
              >
                Start free session
                <ArrowIcon />
              </Link>
              <Link
                href="/dashboard"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
              >
                Find a partner
              </Link>
            </Reveal>

            <Reveal className={styles.heroFoot}>
              <span className={styles.avatars} aria-hidden="true">
                {AVATAR_COLORS.map((bg) => (
                  <span key={bg} style={{ background: bg }} />
                ))}
              </span>
              <span>Free - No card</span>
            </Reveal>
          </div>

          <div className={styles.heroImageWrap}>
            <Image
              src={HeroImage}
              alt="Two users collaborating in a focus session"
              className={styles.heroImage}
              priority
              placeholder="blur"
              sizes="(max-width: 980px) calc(100vw - 40px), (max-width: 1200px) 46vw, 560px"
              quality={90}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
