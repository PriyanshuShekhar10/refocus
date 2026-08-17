"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { defaultSwrConfig } from "@/lib/swr/config";
import { PostHogProvider } from "@/components/posthog-provider";
import { PageRefreshProvider } from "@/components/page-refresh";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <PostHogProvider>
        <SWRConfig value={defaultSwrConfig}>
          <PageRefreshProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </PageRefreshProvider>
        </SWRConfig>
      </PostHogProvider>
    </SessionProvider>
  );
}
