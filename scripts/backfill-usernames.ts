/**
 * Backfill Usernames for Existing Users
 *
 * Generates usernames for users who registered before the username feature.
 * Derives from the email prefix (text before @), appending random digits if taken.
 *
 * Usage:
 *   npx ts-node scripts/backfill-usernames.ts
 *   # or
 *   npm run db:backfill-usernames
 *
 * Safe to run multiple times — skips users who already have a username.
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "refocus";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function backfillUsernames(): Promise<void> {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(MONGODB_DB);
    const usersCol = db.collection("users");

    // Ensure the unique sparse index exists
    await usersCol.createIndex({ username: 1 }, { unique: true, sparse: true });

    // Find all users without a username
    const usersWithout = await usersCol
      .find({ $or: [{ username: { $exists: false } }, { username: null }] })
      .project({ _id: 1, email: 1 })
      .toArray();

    console.log(`Found ${usersWithout.length} user(s) without a username`);

    // Track assigned usernames in this run to avoid collisions within the batch
    const assigned = new Set<string>();
    let updated = 0;
    let skipped = 0;

    for (const user of usersWithout) {
      const email = (user.email as string) || "";
      const baseUsername =
        email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20) || "user";

      let username = baseUsername;
      let found = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        if (assigned.has(username)) {
          username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
          continue;
        }
        const taken = await usersCol.findOne({ username }, { projection: { _id: 1 } });
        if (!taken) {
          found = true;
          break;
        }
        username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
      }

      if (!found) {
        console.log(`  Skipped ${email} — could not find available username after 10 attempts`);
        skipped++;
        continue;
      }

      await usersCol.updateOne({ _id: user._id }, { $set: { username } });
      assigned.add(username);
      updated++;
      console.log(`  ${email} -> @${username}`);
    }

    console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

backfillUsernames();
