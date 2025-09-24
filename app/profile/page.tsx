import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) redirect("/auth/login");

  const db = await getDb();
  const user = (await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(currentUserId) },
      { projection: { email: 1, name: 1, firstname: 1, lastname: 1 } }
    )) as null | {
    _id: ObjectId;
    email?: string;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };

  if (!user) redirect("/auth/login");

  const firstname = user.firstname ?? undefined;
  const lastname = user.lastname ?? undefined;
  const displayName =
    [firstname, lastname].filter(Boolean).join(" ") ||
    user.name ||
    user.email ||
    "User";
  const initials = `${(
    firstname?.[0] ||
    user.name?.[0] ||
    user.email?.[0] ||
    "U"
  ).toUpperCase()}${(lastname?.[0] || "").toUpperCase()}`;

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{displayName}</CardTitle>
            <p className="text-sm text-gray-500">{user.email}</p>
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
              <div className="mt-1 text-base">{user.email || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future edits */}
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
