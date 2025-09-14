import Faq from "@/components/faq";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Navbar from "@/components/navbar/navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col gap-20 items-center">
          <div className="flex-1 flex flex-col gap-20 max-w-5x">
            <Hero />
            <Features />
            <Faq />
          </div>

          <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
            <p>Powered by Refocus</p>
            <ThemeSwitcher />
          </footer>
        </div>
      </main>
    </>
  );
}
