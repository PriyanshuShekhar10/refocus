import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export const ADMIN_ROLE = "admin";

export async function isUserAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId || !ObjectId.isValid(userId)) return false;

  const db = await getDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { role: 1 } },
  )) as { role?: string | null } | null;

  return user?.role === ADMIN_ROLE;
}

type AdminContext = {
  userId: string;
  email: string;
};

type AdminGuardResult =
  | { ok: true; admin: AdminContext }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email;

  if (!userId || !email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!(await isUserAdmin(userId))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, admin: { userId, email } };
}

export async function countAdmins(): Promise<number> {
  const db = await getDb();
  return db.collection("users").countDocuments({ role: ADMIN_ROLE });
}
