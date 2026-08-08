// Shared FAQ content — consumed by the homepage FAQ accordion (React island)
// and by the FAQPage JSON-LD on the homepage.

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
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

/** FAQPage JSON-LD built from the shared FAQ items. */
export function faqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
