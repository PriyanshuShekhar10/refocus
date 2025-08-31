import { NextLogo } from "./next-logo";
import { SupabaseLogo } from "./supabase-logo";
import { NavbarDemo } from "./ui/resizable-navbar";

export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <NavbarDemo />
      Hi!
    </div>
  );
}
