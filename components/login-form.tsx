"use client";

import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (res?.error) throw new Error(res.error);
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <h1 className="text-2xl font-semibold text-black dark:text-white mb-8 tracking-tight">
        Sign in
      </h1>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className={cn(
              "block text-xs font-medium transition-colors duration-200",
              focusedField === "email"
                ? "text-black dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            className="w-full h-11 px-3 bg-transparent border-b border-gray-200 dark:border-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-black dark:focus:border-white transition-colors duration-200"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className={cn(
                "block text-xs font-medium transition-colors duration-200",
                focusedField === "password"
                  ? "text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors duration-200"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            className="w-full h-11 px-3 bg-transparent border-b border-gray-200 dark:border-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-black dark:focus:border-white transition-colors duration-200"
            placeholder="••••••••"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full h-11 mt-6 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200",
            "bg-black dark:bg-white text-white dark:text-black",
            "hover:opacity-80 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Continue"
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-black dark:text-white hover:opacity-70 transition-opacity duration-200"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
