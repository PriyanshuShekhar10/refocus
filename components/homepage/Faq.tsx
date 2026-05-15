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
      "Refocus is for anyone who wants more structure and accountability in their day. Whether you're a student, freelancer, remote worker, or building personal habits, Refocus gives you a focused environment to stay on track.",
  },
  {
    question: "What kind of work can I do on Refocus?",
    answer:
      "You can use Refocus for almost any type of work: studying, writing, coding, planning, administrative tasks, or personal projects. The platform is built to help you focus, whatever the task is.",
  },
  {
    question: "What is body doubling?",
    answer:
      "Body doubling is a productivity technique where working alongside someone, even virtually, helps reduce procrastination and improve focus. Refocus uses this concept by pairing you with another focused person during sessions.",
  },
  {
    question: "Who am I working with?",
    answer:
      "You're matched with another member who is also there to focus. Everyone in the room shares the same goal: show up, work, and help each other stay accountable.",
  },
  {
    question: "Do I have to download another video call app?",
    answer:
      "No. Refocus has a built-in session experience, so you don't need to install or manage another video app. Everything happens directly in your browser.",
  },
  {
    question: "Is Refocus free?",
    answer:
      "Yes. Refocus offers a free plan to get started. If you want more advanced features and expanded usage, premium options are available as well.",
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
          <h2 className={styles.sectionTitle}>Answers before your first session.</h2>
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
