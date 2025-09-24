"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserInfo = {
  email?: string;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
};

export default function Profile() {
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUser(data?.user || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 w-full max-w-xl rounded-lg border bg-gray-50 animate-pulse" />
        <div className="h-36 w-full max-w-xl rounded-lg border bg-gray-50 animate-pulse" />
      </div>
    );
  }

  const firstname = user?.firstname ?? undefined;
  const lastname = user?.lastname ?? undefined;
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    "User";
  const initials = `${(
    firstname?.[0] ||
    user?.name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase()}${(lastname?.[0] || "").toUpperCase()}`;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{displayName}</CardTitle>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-gray-500">First name</div>
              <div className="mt-1 text-base">{firstname || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500">Last name</div>
              <div className="mt-1 text-base">{lastname || "—"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs uppercase text-gray-500">Email</div>
              <div className="mt-1 text-base">{user?.email || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Editing profile fields will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
