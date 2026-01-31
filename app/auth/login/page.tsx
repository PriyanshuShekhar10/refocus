import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/assets/exports";

export default function Page() {
  return (
    <div className="min-h-svh w-full flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-5">
        <Link href="/" className="transition-opacity hover:opacity-70">
          <Image
            src={Logo}
            alt="Refocus"
            className="h-8 w-auto dark:invert"
          />
        </Link>
        <Link
          href="/auth/sign-up"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          Create account
        </Link>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-5 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          &copy; {new Date().getFullYear()} Refocus
        </p>
      </footer>
    </div>
  );
}
