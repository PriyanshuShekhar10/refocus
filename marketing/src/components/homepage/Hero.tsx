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

export function Hero({ image }: { image?: HeroImage }) {
  return (
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <div className={styles.heroCopy}>
          <Reveal as="p" className={styles.heroEyebrow}>
            Virtual coworking
          </Reveal>

          <Reveal as="h1" className={styles.heroTitle}>
            Work alongside someone.
            <br />
            Get more done.
          </Reveal>

          <Reveal as="p" className={styles.heroSub}>
            Refocus pairs you with a real person for a quiet, focused work
            session.
          </Reveal>

          <Reveal className={styles.heroCta}>
            <a
              href={url("/auth/sign-up")}
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
            >
              Start a free session
              <ArrowIcon />
            </a>
          </Reveal>

          <Reveal as="p" className={styles.heroFoot}>
            Free to try · No card required
          </Reveal>
        </div>

        <Reveal className={styles.preview}>
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
                alt="Refocus dashboard with an active focus session"
                className={styles.previewImg}
                width={image.width}
                height={image.height}
                loading="eager"
                decoding="async"
                // @ts-expect-error fetchpriority is a valid HTML attribute
                fetchpriority="high"
              />
            </picture>
          ) : (
            <img
              src="/dashboard.png"
              alt="Refocus dashboard with an active focus session"
              className={styles.previewImg}
              width={2940}
              height={1766}
              loading="eager"
              decoding="async"
            />
          )}
        </Reveal>
      </div>
    </section>
  );
}
