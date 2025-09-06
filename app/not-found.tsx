import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Logo } from "@/assets/exports";
import { createClient } from "@/lib/supabase/server";
import { NavbarLogo } from "@/components/navbar/navbar";

export default async function NotFound() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-8 px-4">
        <div className="mb-8 flex justify-center">
          {/* <Image
            src={Logo}
            alt="Refocus Logo"
            width={192}
            height={77}
            className="mx-auto "
          /> */}
          <NavbarLogo />
        </div>

        {/* 404 Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Hang Tight! The team is working on it!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
          {!user && (
            <Button variant="outline" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
