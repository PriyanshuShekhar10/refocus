"use client";
import Image from "next/image";
import { Graphic2, PastBuddies } from "@/assets/exports";
import { motion } from "framer-motion";

export const Features = () => {
  return (
    <div id="features" className="flex flex-col gap-8 xs:gap-12 md:gap-16 items-center my-6 xs:my-8">
      <section className="w-screen h-max pb-12 xs:pb-16 md:pb-20 px-3 xs:px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="max-w-screen-lg mx-auto text-center py-12 xs:py-16 sm:py-20 md:py-24 px-3 xs:px-4">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 dark:text-white mb-4 xs:mb-6 md:mb-8 leading-tight sm:leading-normal">
            Consider yourself limitless
          </h1>
          <p className="text-base xs:text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed px-2 xs:px-4">
            Focus gets easier when you don&apos;t have to do it alone.
          </p>
        </div>

        {/* Features Grid */}
        <div className="flex flex-col gap-6 xs:gap-8 mt-12 xs:mt-16 md:mt-24 mx-3 xs:mx-4 sm:mx-8 md:mx-12 lg:mx-16 items-center justify-between">
          {/* Feature 1 */}
          <motion.div
            className="bg-gray-100 dark:bg-gray-800 w-full rounded-2xl xs:rounded-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8 md:gap-12 items-center p-4 xs:p-6 sm:p-8 lg:pl-10 lg:pr-0"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Left Content */}
            <div className="space-y-3 xs:space-y-4 md:space-y-6 px-2 xs:px-4 sm:px-8 md:px-16 lg:px-32 order-2 lg:order-1">
              <h2 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-gray-900 dark:text-white">
                Track your progress, celebrate your wins
              </h2>
              <p className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                Stay motivated with achievements, streaks, and milestones that
                keep you moving forward.
              </p>
              {/* <button className="px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium shadow-md hover:opacity-90 transition text-sm xs:text-base mt-2 xs:mt-3 sm:mt-4">
                Placeholder
              </button> */}
            </div>

            {/* Right Image */}
            <div className="relative w-full h-full flex items-center justify-center order-1 lg:order-2">
              <div className="rounded-2xl xs:rounded-3xl w-full">
                <Image
                  src={Graphic2}
                  alt="graphic"
                  className="rounded-xl xs:rounded-2xl w-full h-auto"
                  priority
                />
              </div>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            className="bg-gray-100 dark:bg-gray-800 w-full rounded-2xl xs:rounded-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8 md:gap-12 items-center p-4 xs:p-6 sm:p-8 lg:pl-0 lg:pr-10"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            {/* Left Image */}
            <div className="relative w-full h-full flex items-center justify-center order-1">
              <div className="rounded-2xl xs:rounded-3xl w-full">
                <Image
                  src={PastBuddies}
                  alt="past-buddies"
                  className="rounded-xl xs:rounded-2xl w-full h-auto"
                  priority
                />
              </div>
            </div>

            {/* Right Content */}
            <div className="space-y-3 xs:space-y-4 md:space-y-6 px-2 xs:px-4 sm:px-8 md:px-16 lg:px-32 order-2">
              <h2 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-gray-900 dark:text-white">
                Stay connected, effortlessly
              </h2>
              <p className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                Effortlessly manage past connections and schedule catch-ups
                anytime.
              </p>
              {/* <button className="px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium shadow-md hover:opacity-90 transition text-sm xs:text-base mt-2 xs:mt-3 sm:mt-4">
                Placeholder
              </button> */}
            </div>
          </motion.div>

          {/* Feature 3 - Commented out but made responsive */}
          {/* <motion.div
            className="bg-gray-100 dark:bg-gray-800 w-full rounded-2xl xs:rounded-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8 md:gap-12 items-center p-4 xs:p-6 sm:p-8 md:p-10"
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
          >
            <div className="space-y-3 xs:space-y-4 md:space-y-6 px-2 xs:px-4 sm:px-8">
              <h2 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-gray-900 dark:text-white">
                Create at the speed of thought
              </h2>
              <p className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                Tell Base44 your idea, and watch it transform into a working
                app— complete with all the necessary components, pages, flows
                and features.
              </p>
              <button className="px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium shadow-md hover:opacity-90 transition text-sm xs:text-base mt-2 xs:mt-3 sm:mt-4">
                Start building
              </button>
            </div>
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="rounded-2xl xs:rounded-3xl w-full">
                <Image
                  src={Graphic2}
                  alt="graphic"
                  className="rounded-xl xs:rounded-2xl w-full h-auto"
                  priority
                />
              </div>
            </div>
          </motion.div> */}
        </div>
      </section>
    </div>
  );
};