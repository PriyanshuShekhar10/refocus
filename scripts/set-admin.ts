/**
 * Grant or revoke admin role for a user by email.
 *
 * Usage:
 *   npx ts-node scripts/set-admin.ts priyanshushekhar100@gmail.com
 *   npx ts-node scripts/set-admin.ts user@example.com --revoke
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const ADMIN_ROLE = "admin";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "refocus";

async function main(): Promise<void> {
  const emailArg = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!emailArg) {
    console.error("Usage: npx ts-node scripts/set-admin.ts <email> [--revoke]");
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const users = db.collection("users");

    const result = await users.findOneAndUpdate(
      { email },
      revoke
        ? { $unset: { role: "" }, $set: { updatedAt: new Date() } }
        : { $set: { role: ADMIN_ROLE, updatedAt: new Date() } },
      { returnDocument: "after", projection: { email: 1, username: 1, role: 1 } },
    );

    if (!result) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(
      revoke
        ? `Revoked admin for ${result.email}`
        : `Granted admin to ${result.email} (role=${result.role})`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
