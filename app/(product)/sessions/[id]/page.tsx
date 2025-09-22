import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";

export default async function SessionJoinPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!(session as any)?.user?.id) return notFound();

  const db = await getDb();
  const s = await db.collection("sessions").findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        start_time: 1,
        end_time: 1,
        session_type: 1,
        duration_min: 1,
        name: 1,
      },
    }
  );
  if (!s) return notFound();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Session</h1>
      <div className="mt-4 space-y-2">
        <div className="text-sm text-gray-700">ID: {id}</div>
        {s.name && <div className="text-sm text-gray-700">Name: {s.name}</div>}
        <div className="text-sm text-gray-700">
          Type: {s.session_type} • {s.duration_min} min
        </div>
        <div className="text-sm text-gray-700">
          When: {new Date(s.start_time).toLocaleString()}
        </div>
      </div>
      <p className="mt-6 text-gray-600">
        This is a placeholder join page. Embed your meeting provider here.
      </p>
    </div>
  );
}
