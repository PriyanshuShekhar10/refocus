import { getDb } from "@/lib/mongodb";

export default async function Page() {
  const db = await getDb();
  const notes = await db
    .collection("notes")
    .find({}, { projection: { _id: 0 } })
    .toArray();

  return <pre>{JSON.stringify(notes, null, 2)}</pre>;
}
