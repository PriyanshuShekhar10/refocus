"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const freeFeatures = [
  "Body doubling sessions",
  "Accountability partner matching",
  "Built-in video calls",
  "Progress tracking & streaks",
];

const paidFeatures = [
  "Unlimited focus sessions",
  "Priority partner matching",
  "Advanced analytics & insights",
  "Extended session durations",
];

export const Pricing = () => {
  return (
    <section id="pricing" className="w-full py-12 xs:py-16 md:py-20 px-3 xs:px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Main Pricing Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Left - Header Section */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[280px] lg:min-h-[360px]">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-white leading-tight">
                Pricing plans
                <br />
                for every need
              </h2>
              <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Scale as you go with plans designed
                <br className="hidden sm:block" />
                to match your productivity goals.
              </p>
            </div>
            
            {/* Orange Dots Graphic */}
            <div className="mt-8 lg:mt-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Orange dots pattern */}
                  <circle cx="32" cy="12" r="6" fill="#F97316" />
                  <circle cx="20" cy="24" r="5" fill="#FB923C" />
                  <circle cx="44" cy="24" r="5" fill="#FB923C" />
                  <circle cx="14" cy="38" r="4" fill="#FDBA74" />
                  <circle cx="32" cy="32" r="7" fill="#F97316" />
                  <circle cx="50" cy="38" r="4" fill="#FDBA74" />
                  <circle cx="20" cy="50" r="4" fill="#FDBA74" />
                  <circle cx="44" cy="50" r="4" fill="#FDBA74" />
                  <circle cx="32" cy="52" r="3" fill="#FED7AA" />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle - Free Tier */}
          <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[280px] lg:min-h-[360px] border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Green gradient background */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-100/80 via-green-50/40 to-transparent dark:from-green-900/30 dark:via-green-900/10 dark:to-transparent pointer-events-none" />
            
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                Start for free
              </h3>
              
              <div className="mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Get access to:</p>
                <ul className="space-y-2.5">
                  {freeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2.5 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                      <svg className="w-4 h-4 text-orange-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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

          {/* Right - Paid Tier (Coming Soon) */}
          <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[280px] lg:min-h-[360px] border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Rainbow/pastel gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-100/60 via-purple-100/40 to-cyan-100/60 dark:from-pink-900/20 dark:via-purple-900/15 dark:to-cyan-900/20 pointer-events-none" />
            
            {/* Grey overlay for "coming soon" effect */}
            <div className="absolute inset-0 bg-gray-100/70 dark:bg-gray-800/70 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-400 dark:text-gray-500">
                  Pro
                </h3>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                  Coming soon
                </span>
              </div>
              
              <div className="mt-2">
                <span className="text-4xl sm:text-5xl font-bold text-gray-400 dark:text-gray-500">$ --</span>
                <span className="text-lg sm:text-xl text-gray-400 dark:text-gray-500">/mo</span>
              </div>
              
              <div className="mt-5">
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">Everything in Free, plus:</p>
                <ul className="space-y-2.5">
                  {paidFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2.5 text-sm sm:text-base text-gray-400 dark:text-gray-500">
                      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="relative z-10 mt-8">
              <button
                disabled
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-full font-medium text-sm sm:text-base cursor-not-allowed"
              >
                Notify me
              </button>
            </div>
          </div>
        </motion.div>

        {/* Enterprise Banner */}
        <motion.div
          className="mt-4 md:mt-6 rounded-xl bg-gray-100 dark:bg-gray-800 py-4 px-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        >
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
            Looking for team or enterprise solutions?{" "}
            <a
              href="mailto:contact@refocus.com"
              className="font-medium text-gray-900 dark:text-white hover:underline inline-flex items-center gap-1"
            >
              Contact us
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
