import { getDb } from "@/lib/mongodb";

// Skip static generation at build time — this page needs MongoDB at runtime only.
export const dynamic = "force-dynamic";

export default async function Page() {
  const db = await getDb();
  const notes = await db
    .collection("notes")
    .find({}, { projection: { _id: 0 } })
    .toArray();

  return <pre>{JSON.stringify(notes, null, 2)}</pre>;
}
