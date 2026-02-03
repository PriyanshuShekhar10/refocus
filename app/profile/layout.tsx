import { ThemeSwitcher } from "@/components/theme-switcher";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center pt-24 pb-16 px-4">
      <div className="flex-1 w-full flex flex-col gap-8 items-center">
        <div className="flex-1 flex flex-col gap-8 w-full max-w-3xl">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8 mt-8">
          <p className="text-muted-foreground">Powered by Refocus</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
