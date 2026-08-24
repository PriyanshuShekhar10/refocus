"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const freeFeatures = [
  "Body doubling sessions",
  "Accountability partner matching",
  "Built-in video calls",
  "Progress tracking & streaks",
];

export const Pricing = () => {
  return (
    <section id="pricing" className="w-full py-12 xs:py-16 md:py-20 px-3 xs:px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[280px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-green-100/80 via-green-50/40 to-transparent dark:from-green-900/30 dark:via-green-900/10 dark:to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                Free to start
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                No credit card required
              </p>

              <div className="mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Get access to:
                </p>
                <ul className="space-y-2.5">
                  {freeFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm sm:text-base text-gray-700 dark:text-gray-300"
                    >
                      <svg
                        className="w-4 h-4 text-orange-500 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm sm:text-base hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
