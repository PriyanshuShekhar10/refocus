"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
