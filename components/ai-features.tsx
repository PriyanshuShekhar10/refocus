"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const aiFeatures = [
  {
    badge: "Smart Goals",
    title: "AI turns vague plans into real goals",
    description:
      "Type something like \"study math\" and our AI instantly refines it into a clear, actionable SMART goal you can actually finish in one session.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
    ),
    visual: "goals",
  },
  {
    badge: "AI Matchmaking",
    title: "Find your perfect focus partner",
    description:
      "Our vector-based AI reads your interests and goals, then matches you with the people most likely to keep you accountable.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
    visual: "match",
  },
  {
    badge: "Smart Scheduling",
    title: "Book sessions with a single sentence",
    description:
      "Just say \"3 evening sessions this week for my History exam\" and let the AI handle the rest — finding slots, matching partners, and booking automatically.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    ),
    visual: "schedule",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

/* ─── Decorative mini-visuals per card ─── */
function GoalVisual() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Before → After animation */}
      <div className="flex items-center gap-3 w-full max-w-[260px]">
        <motion.div
          className="flex-1 px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 line-through"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 0.6, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          study math
        </motion.div>
        <motion.svg
          className="w-5 h-5 text-indigo-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </motion.svg>
        <motion.div
          className="flex-1 px-3 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
        >
          Solve 15 calculus problems
        </motion.div>
      </div>
      {/* Sparkle */}
      <motion.div
        className="flex items-center gap-1.5 text-[11px] text-indigo-500 dark:text-indigo-400 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Refined by AI
      </motion.div>
    </div>
  );
}

function MatchVisual() {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* User A */}
      <motion.div
        className="flex flex-col items-center gap-1.5"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-11 h-11 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
          Y
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          You
        </span>
      </motion.div>

      {/* Connection line + score */}
      <div className="flex flex-col items-center gap-1">
        <motion.div
          className="h-[2px] w-16 bg-gradient-to-r from-indigo-400 to-green-400 rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        />
        <motion.span
          className="text-[10px] font-semibold text-green-600 dark:text-green-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          92% match
        </motion.span>
      </div>

      {/* User B */}
      <motion.div
        className="flex flex-col items-center gap-1.5"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-11 h-11 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center text-sm font-bold text-orange-700 dark:text-orange-300">
          A
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          Partner
        </span>
      </motion.div>
    </div>
  );
}

function ScheduleVisual() {
  return (
    <div className="space-y-2.5 w-full max-w-[240px] mx-auto">
      {/* Chat bubble */}
      <motion.div
        className="px-3 py-2 rounded-2xl rounded-bl-sm bg-indigo-100 dark:bg-indigo-900/60 text-[11px] text-indigo-700 dark:text-indigo-300 w-fit"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        &quot;3 evening sessions for History&quot;
      </motion.div>

      {/* AI response blocks */}
      <motion.div
        className="space-y-1.5 pl-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {["Mon 6 PM", "Wed 6 PM", "Fri 6 PM"].map((day, i) => (
          <motion.div
            key={day}
            className="flex items-center gap-2 text-[11px]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 + i * 0.15 }}
          >
            <div className="w-4 h-4 rounded-md bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <svg
                className="w-2.5 h-2.5 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-gray-600 dark:text-gray-300">{day}</span>
            <span className="text-gray-400 dark:text-gray-500">· Booked</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function AIFeatures() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleCtaClick = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/auth/sign-up");
    }
  };

  return (
    <section className="w-full py-20 md:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-14 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-4">
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Powered by AI
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 dark:text-white mb-4">
            Intelligence built into every session
          </h2>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Refocus uses AI to set better goals, find the right partners, and
            schedule your sessions — so you can just focus.
          </p>
        </motion.div>

        {/* ── Cards ── */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {aiFeatures.map((feature, i) => (
            <motion.div
              key={i}
              className="group bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-shadow duration-300"
              variants={cardVariants}
            >
              {/* Badge + text */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Visual area */}
              <div className="px-6 pb-6">
                <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-2xl h-48 overflow-hidden flex items-center justify-center">
                  {feature.visual === "goals" && <GoalVisual />}
                  {feature.visual === "match" && <MatchVisual />}
                  {feature.visual === "schedule" && <ScheduleVisual />}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          className="text-center mt-12 md:mt-16 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Let AI handle the busywork. You handle the deep work.
          </p>
          <button
            type="button"
            onClick={handleCtaClick}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors duration-200"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Try AI-powered sessions
          </button>
        </motion.div>
      </div>
    </section>
  );
}
