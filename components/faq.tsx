"use client";

import { useId, useRef, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type Props = {
  title?: string;
  allowMultiple?: boolean;
  pointerCursorUrl?: string;
  className?: string;
};

const faqItems: FaqItem[] = [
  {
    question: "Who is Refocus for?",
    answer:
      "Refocus is for anyone who wants more structure and accountability in their day. Whether you’re a student, freelancer, remote worker, or just looking to stay consistent with personal goals, Refocus provides a supportive environment to help you stay on track.",
  },
  {
    question: "What kind of work can I do on Refocus?",
    answer:
      "You can use Refocus for almost any type of work — studying, writing, coding, planning, administrative tasks, or even personal projects. The platform is designed to help you stay focused, no matter the task.",
  },
  {
    question: "What is body doubling?",
    answer:
      "Body doubling is a productivity technique where working alongside someone — even virtually — helps you stay focused and avoid procrastination. Refocus uses this concept by pairing you with an accountability partner during your sessions.",
  },
  {
    question: "Who am I working with?",
    answer:
      "On Refocus, you’re matched with another member who’s also looking to stay productive. Everyone on the platform shares the same goal: to support each other in getting things done.",
  },
  {
    question: "Do I have to download another video call app?",
    answer:
      "No. Refocus has a built-in video experience, so you don’t need to install or manage any additional apps. Everything happens right inside the platform.",
  },
  {
    question: "Is Refocus free?",
    answer:
      "Yes! Refocus offers a free plan with everything you need to get started. For more advanced features and unlimited sessions, we also offer affordable premium options.",
  },
];

export default function Faq({
  title = "FAQs",
  allowMultiple = false,
  pointerCursorUrl,
  className = "",
}: Props) {
  const [open, setOpen] = useState<number[]>([]);
  const baseId = useId();

  const toggle = (i: number) => {
    setOpen((prev) =>
      allowMultiple
        ? prev.includes(i)
          ? prev.filter((x) => x !== i)
          : [...prev, i]
        : prev.includes(i)
        ? []
        : [i]
    );
  };

  return (
    <section id="faq" className={`mx-auto max-w-5xl px-6 ${className}`}>
      <h2 className="mb-6 text-4xl/[1.1] font-semibold md:text-6xl">{title}</h2>

      <ul
        role="list"
        className="divide-y divide-black/15  dark:divide-white/15"
      >
        {faqItems.map((item, i) => {
          const isOpen = open.includes(i);
          const panelId = `${baseId}-panel-${i}`;
          const btnId = `${baseId}-button-${i}`;
          return (
            <li key={i}>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className={[
                  "flex w-full items-center justify-between gap-4 py-7 text-left",
                  "text-[clamp(1rem,1.8vw,1.375rem)] leading-snug",
                  "cursor-pointer",
                ].join(" ")}
                style={
                  pointerCursorUrl
                    ? { cursor: `url(${pointerCursorUrl}), pointer` }
                    : undefined
                }
              >
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="relative inline-flex h-[22px] w-[22px] flex-none items-center justify-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    className="text-[#0f1226] dark:text-white/15"
                  >
                    <path
                      d="M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {!isOpen && (
                      <path
                        d="M12 5v14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </span>
              </button>

              <Collapse id={panelId} labelledBy={btnId} open={isOpen}>
                <div className="pb-6 pr-10 text-base leading-relaxed text-black/80 dark:text-white">
                  {item.answer}
                </div>
              </Collapse>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Collapse({
  id,
  labelledBy,
  open,
  children,
}: {
  id: string;
  labelledBy: string;
  open: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const maxH = ref.current
    ? `${ref.current.scrollHeight}px`
    : open
    ? "1000px"
    : "0px";

  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: open ? maxH : "0px" }}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}
