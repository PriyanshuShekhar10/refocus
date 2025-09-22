import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function SessionJoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: s } = await supabase
    .from("sessions")
    .select("id, start_time, end_time, session_type, duration_min, name")
    .eq("id", id)
    .single();
  if (!s) return notFound();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Session</h1>
      <div className="mt-4 space-y-2">
        <div className="text-sm text-gray-700">ID: {s.id}</div>
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
