/**
 * Backfill Call Attendance for Pre-existing Sessions
 *
 * Adds call_joined_at and call_completed fields to participants of sessions
 * that already ended before attendance tracking shipped. Legacy participants
 * are treated as having attended and completed their sessions so the user's
 * historical stats aren't retroactively flooded with "missed" entries.
 *
 * Per participant:
 *   call_joined_at  -> joined_at (booking time) — best proxy we have
 *   call_completed  -> true
 *
 * Only sessions with end_time < now are touched. Only fields that don't
 * already exist are set, so the script is safe to re-run and won't clobber
 * real attendance records captured after the feature shipped.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/backfill-attendance.ts
 *   # or
 *   npm run db:backfill-attendance
 *
 * Dry run (count only, no writes):
 *   DRY_RUN=1 npx ts-node --project tsconfig.json scripts/backfill-attendance.ts
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "refocus";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function backfillAttendance(): Promise<void> {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log(
      `Connected to MongoDB${DRY_RUN ? " (DRY RUN — no writes)" : ""}`,
    );

    const db = client.db(MONGODB_DB);
    const sessionsCol = db.collection("sessions");
    const now = new Date();

    // Match ended sessions where at least one participant entry is missing
    // either of the new attendance fields. The pipeline-style $set below
    // will then patch every element of the array that needs it.
    const filter = {
      end_time: { $lt: now },
      $or: [
        { "session_participants.call_joined_at": { $exists: false } },
        { "session_participants.call_completed": { $exists: false } },
      ],
    };

    const candidateCount = await sessionsCol.countDocuments(filter);
    console.log(`Found ${candidateCount} ended session(s) needing backfill`);

    if (candidateCount === 0) {
      console.log("Nothing to do.");
      return;
    }

    // Count participants that will actually flip — useful for dry-run
    // reporting and as a post-write sanity check.
    const counts = await sessionsCol
      .aggregate<{ _id: null; toFill: number; total: number }>([
        { $match: filter },
        { $unwind: "$session_participants" },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            toFill: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      {
                        $eq: [
                          { $ifNull: ["$session_participants.call_joined_at", null] },
                          null,
                        ],
                      },
                      {
                        $eq: [
                          { $ifNull: ["$session_participants.call_completed", null] },
                          null,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const total = counts[0]?.total ?? 0;
    const toFill = counts[0]?.toFill ?? 0;
    console.log(
      `  participants in those sessions: ${total} (will patch ${toFill})`,
    );

    if (DRY_RUN) {
      console.log("\nDry run complete. Re-run without DRY_RUN=1 to apply.");
      return;
    }

    // Pipeline update: rebuild session_participants with $map + $mergeObjects
    // so per-element conditionals work in a single round trip. $ifNull only
    // fills the new fields when they're absent, preserving any real values
    // already written by the runtime attendance flow.
    const result = await sessionsCol.updateMany(filter, [
      {
        $set: {
          session_participants: {
            $map: {
              input: { $ifNull: ["$session_participants", []] },
              as: "p",
              in: {
                $mergeObjects: [
                  "$$p",
                  {
                    call_joined_at: {
                      $ifNull: [
                        "$$p.call_joined_at",
                        { $ifNull: ["$$p.joined_at", "$start_time"] },
                      ],
                    },
                    call_completed: {
                      $ifNull: ["$$p.call_completed", true],
                    },
                  },
                ],
              },
            },
          },
          updated_at: new Date(),
        },
      },
    ]);

    console.log(
      `\nDone: matched ${result.matchedCount}, modified ${result.modifiedCount} session(s).`,
    );
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

backfillAttendance();
