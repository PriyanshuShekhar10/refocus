"use client";

import { useId, useState } from "react";
import styles from "./Homepage.module.css";
import { Reveal } from "./Reveal";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Who is Refocus for?",
    answer:
      "Students, freelancers, remote workers, and anyone needing accountability.",
  },
  {
    question: "What kind of work can I do on Refocus?",
    answer:
      "Study, writing, coding, planning, admin, and personal projects.",
  },
  {
    question: "What is body doubling?",
    answer:
      "Working alongside someone else to reduce procrastination and stay focused.",
  },
  {
    question: "Who am I working with?",
    answer:
      "Another member focused on their own task at the same time.",
  },
  {
    question: "Do I have to download another video call app?",
    answer:
      "No. Everything runs in your browser.",
  },
  {
    question: "Is Refocus free?",
    answer:
      "Yes. Free to start. Paid upgrades are optional.",
  },
];

export function Faq() {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);
  const baseId = useId();

  const toggle = (index: number) => {
    setOpenIndexes((prev) => (prev.includes(index) ? [] : [index]));
  };

  return (
    <section className={styles.block} id="faq">
      <div className={styles.wrap}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.eyebrow}>05 — FAQs</span>
          <h2 className={styles.sectionTitle}>Quick answers.</h2>
        </Reveal>

        <ul className={styles.faqList} role="list">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndexes.includes(index);
            const buttonId = `${baseId}-button-${index}`;
            const panelId = `${baseId}-panel-${index}`;

            return (
              <Reveal
                key={item.question}
                delayMs={index * 40}
                as="li"
                className={styles.faqItem}
              >
                <button
                  id={buttonId}
                  type="button"
                  className={styles.faqButton}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                >
                  <span>{item.question}</span>
                  <span aria-hidden className={styles.faqIcon}>
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`${styles.faqPanel} ${isOpen ? styles.faqPanelOpen : ""}`}
                >
                  <p className={styles.faqAnswer}>{item.answer}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
