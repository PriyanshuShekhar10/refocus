"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const steps = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: "You'll show up",
    text: "Someone's waiting for you. That's enough to get you there.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "You'll set real goals",
    text: "No more vague plans. You'll commit to goals you can actually finish.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    title: "You'll stay focused",
    text: "That urge to check Twitter? Gone when you have to share what you got done.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    // Keep transition simple to satisfy framer-motion's typed Transition
    transition: { duration: 0.6 },
  },
};

export function WhyItWorks() {
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
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 dark:text-white mb-4">
            Why it works
          </h2>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            When humans meet, magic happens. Here&apos;s the science behind it.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="group bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-shadow duration-300"
              variants={cardVariants}
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {step.text}
                </p>
              </div>

              {/* Visual area */}
              <div className="px-6 pb-6">
                <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-2xl h-48 overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {i === 0 && (
                      <div className="flex items-end gap-3">
                        <div className="w-12 h-16 bg-indigo-200 dark:bg-indigo-800 rounded-xl" />
                        <div className="w-12 h-20 bg-indigo-300 dark:bg-indigo-700 rounded-xl" />
                        <div className="w-12 h-14 bg-indigo-100 dark:bg-indigo-900 rounded-xl" />
                        <motion.div 
                          className="absolute -right-2 top-6 w-8 h-8 bg-green-400 dark:bg-green-500 rounded-full flex items-center justify-center"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </motion.div>
                      </div>
                    )}
                    {i === 1 && (
                      <div className="space-y-3 w-full max-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md border-2 border-indigo-400 dark:border-indigo-500 flex items-center justify-center">
                            <motion.svg 
                              className="w-3 h-3 text-indigo-500"
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </motion.svg>
                          </div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full flex-1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md border-2 border-indigo-400 dark:border-indigo-500 flex items-center justify-center">
                            <motion.svg 
                              className="w-3 h-3 text-indigo-500"
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8 }}
                            >
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </motion.svg>
                          </div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
                        </div>
                      </div>
                    )}
                    {i === 2 && (
                      <div className="relative">
                        <motion.div 
                          className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <svg className="w-10 h-10 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                          </svg>
                        </motion.div>
                        <motion.div 
                          className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full"
                          animate={{ scale: [0.8, 1, 0.8] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <motion.div 
                          className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-400 rounded-full"
                          animate={{ scale: [1, 0.8, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12 md:mt-16 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Ready to focus with someone who&apos;s actually there with you?
          </p>
          <button
            type="button"
            onClick={handleCtaClick}
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors duration-200"
          >
            Yes, match me with a partner
          </button>
        </motion.div>
      </div>
    </section>
  );
}
