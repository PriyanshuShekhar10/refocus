import Navbar from "@/components/navbar/navbar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Users, Heart, Zap, Globe } from "lucide-react";

const values = [
  {
    icon: Users,
    title: "People First",
    description:
      "We believe in building meaningful connections. Our team works closely, supports each other, and grows together.",
  },
  {
    icon: Heart,
    title: "Purpose Driven",
    description:
      "Every feature we build helps people focus and achieve their goals. Your work here matters.",
  },
  {
    icon: Zap,
    title: "Move Fast",
    description:
      "We ship early, learn quickly, and iterate. You'll have real impact from day one.",
  },
  {
    icon: Globe,
    title: "Remote Friendly",
    description:
      "Work from anywhere. We're a distributed team that values async communication and flexibility.",
  },
];

export default function CareerPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20 px-6">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 dark:from-indigo-950/40 dark:via-gray-900 dark:to-emerald-950/30" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-200/40 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="relative max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-medium tracking-wide uppercase rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              We&apos;re Hiring
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Help people find focus,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600 dark:from-indigo-400 dark:to-emerald-400">
                together
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Join a small, passionate team building the future of focused work.
              We&apos;re creating a space where people connect, stay accountable,
              and achieve more.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-6 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-4">
              Why Refocus?
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-xl mx-auto">
              We&apos;re building something meaningful. Here&apos;s what you can expect.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {values.map((v) => (
                <div
                  key={v.title}
                  className="group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <v.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {v.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {v.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Roles / Coming Soon */}
        <section className="py-16 px-6 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Open Roles
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              We&apos;re preparing to grow our team. Check back soon for open positions.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Roles opening soon
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Want to be notified?
            </h2>
            <p className="text-indigo-100 mb-8">
              Drop us an email and we&apos;ll reach out when we open applications.
            </p>
            <a
              href="mailto:careers@refocus.app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-medium hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/30"
            >
              careers@refocus.app
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full flex items-center justify-center border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center text-xs gap-8 py-10">
          <p className="text-gray-500 dark:text-gray-400">Powered by Refocus</p>
          <ThemeSwitcher />
        </footer>
      </main>
    </>
  );
}
