import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavbarLogo } from "@/components/navbar/navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function NotFound() {
  const session = await getServerSession(authOptions);
  const isAuthed = !!session?.user;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-8 px-4">
        <div className="mb-8 flex justify-center">
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
          {!isAuthed && (
            <Button variant="outline" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
