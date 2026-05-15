import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";
import { Shell, designStyles } from "@/components/design";
import { Logo } from "@/assets/exports";

type AuthShellProps = {
  children: ReactNode;
  /** Right-side header link, e.g. { label: "Create account", href: "/auth/sign-up" } */
  headerLink?: { label: string; href: string };
};

/** Shared chrome for all /auth/* pages: brand top-left, optional link top-right,
 *  centered card, quiet footer. Matches the homepage design tokens. */
export function AuthShell({ children, headerLink }: AuthShellProps) {
  return (
    <Shell>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          className={designStyles.wrap}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 72,
            paddingTop: 0,
            paddingBottom: 0,
          }}
        >
          <Link href="/" className={designStyles.brand}>
            <Image
              src={Logo}
              alt="Refocus"
              className="h-7 w-auto dark:invert dark:brightness-0"
              priority
            />
          </Link>
          {headerLink && (
            <Link
              href={headerLink.href}
              className={`${designStyles.btn} ${designStyles.btnQuiet}`}
            >
              {headerLink.label}
            </Link>
          )}
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 0 64px",
          }}
        >
          <div
            className={designStyles.wrapTight}
            style={{ width: "100%", maxWidth: 440 }}
          >
            {children}
          </div>
        </main>

        <footer
          className={designStyles.wrap}
          style={{
            paddingTop: 16,
            paddingBottom: 24,
            fontSize: 12,
            color: "var(--ink-mute)",
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Refocus · made for deep work
        </footer>
      </div>
    </Shell>
  );
}
