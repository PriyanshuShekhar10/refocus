"use client";
import Image from "next/image";
import { Graphic2, PastBuddies } from "@/assets/exports";
import { motion } from "framer-motion";
export const Features = () => {
  return (
    <div className="flex flex-col gap-16 items-center my-8">
      <section className="w-screen h-max pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-lg mx-auto text-center py-24">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 dark:text-white mb-8 leading-normal">
            Consider yourself limitless
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Focus gets easier when you don&apos;t have to do it alone.
          </p>
        </div>

        {/* 3 features */}
        <div className="flex flex-col gap-8 mt-24 mx-16 items-center justify-between">
          {/* Feature 1 */}
          <motion.div
            className="bg-gray-100 dark:bg-gray-800 w-full rounded-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pl-10"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Left Content */}
            <div className="space-y-6 px-32">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-gray-900 dark:text-white">
                Track your progress, celebrate your wins
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                Stay motivated with achievements, streaks, and milestones that
                keep you moving forward.
              </p>
              <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium shadow-md hover:opacity-90 transition">
                Touch me
              </button>
            </div>
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="rounded-3xl w-full">
                <Image
                  src={Graphic2}
                  alt="graphic"
                  className="rounded-2xl w-full h-auto"
                  priority
                />
              </div>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            className="bg-gray-100 dark:bg-gray-800 w-full rounded-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pr-10"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="rounded-3xl">
                <Image
                  src={PastBuddies}
                  alt="past-buddies"
                  className="rounded-2xl h-auto"
                  priority
                />
              </div>
            </div>
            <div className="space-y-6 px-32">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-gray-900 dark:text-white">
                Stay connected, effortlessly
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                Effortlessly manage past connections and schedule catch-ups
                anytime.
              </p>
              <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium shadow-md hover:opacity-90 transition">
                Touch me more
              </button>
            </div>
          </motion.div>

          {/* Feature 3 */}
          {/* <div className="bg-gray-100 dark:bg-gray-800 w-full rounded-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center p-10">
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-gray-900 dark:text-white">
                Create at the speed of thought
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                Tell Base44 your idea, and watch it transform into a working
                app— complete with all the necessary components, pages, flows
                and features.
              </p>
              <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium shadow-md hover:opacity-90 transition">
                Start building
              </button>
            </div>
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="rounded-3xl w-full">
                <Image
                  src={Graphic2}
                  alt="graphic"
                  className="rounded-2xl w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div> */}
        </div>
      </section>
    </div>
  );
};
