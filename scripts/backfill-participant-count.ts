/**
 * Backfill participant_count on sessions.
 *
 * Sets participant_count = session_participants.length (or 0) for every
 * session document. Idempotent — safe to re-run.
 *
 * Usage:
 *   npm run db:backfill-participant-count
 *   DRY_RUN=1 npm run db:backfill-participant-count
 */

import { MongoClient, type AnyBulkWriteOperation, type Document, type ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "refocus";
const DRY_RUN = process.env.DRY_RUN === "1";
const BATCH = 500;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection("sessions");

  const total = await col.countDocuments({});
  console.log(`Sessions total: ${total}${DRY_RUN ? " (dry run)" : ""}`);

  let scanned = 0;
  let updated = 0;
  let cursor = col.find(
    {},
    { projection: { session_participants: 1, participant_count: 1 } },
  ).batchSize(BATCH);

  const ops: AnyBulkWriteOperation<Document>[] = [];

  for await (const doc of cursor) {
    scanned += 1;
    const count = Array.isArray(doc.session_participants)
      ? doc.session_participants.length
      : 0;
    if (doc.participant_count === count) continue;

    ops.push({
      updateOne: {
        filter: { _id: doc._id as ObjectId },
        update: { $set: { participant_count: count } },
      },
    });

    if (ops.length >= BATCH) {
      if (!DRY_RUN) {
        const res = await col.bulkWrite(ops, { ordered: false });
        updated += res.modifiedCount;
      } else {
        updated += ops.length;
      }
      ops.length = 0;
      console.log(`… scanned ${scanned}, updated ${updated}`);
    }
  }

  if (ops.length > 0) {
    if (!DRY_RUN) {
      const res = await col.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount;
    } else {
      updated += ops.length;
    }
  }

  console.log(`Done. scanned=${scanned} updated=${updated}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
