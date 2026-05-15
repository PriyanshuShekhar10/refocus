import Link from "next/link";
import { Shell, designStyles, MinimalNav } from "@/components/design";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <MinimalNav
        ctas={[
          { label: "Dashboard", href: "/dashboard", variant: "quiet" },
          { label: "Settings", href: "/dashboard?tab=settings", variant: "primary" },
        ]}
      />
      <main
        style={{
          padding: "56px 0 80px",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div className={designStyles.wrap}>{children}</div>
      </main>
      <footer className={designStyles.footer} style={{ marginTop: 24 }}>
        <div className={`${designStyles.wrap} ${designStyles.footInner}`}>
          <Link href="/" className={designStyles.brand}>
            <span className={designStyles.brandMark} aria-hidden="true" />
            <span>Refocus</span>
          </Link>
          <div className={designStyles.footMeta}>made for deep work</div>
        </div>
      </footer>
    </Shell>
  );
}
