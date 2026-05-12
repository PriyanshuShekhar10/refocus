/**
 * MongoDB Index Migration Script
 *
 * This script creates the necessary indexes for optimal query performance.
 * Run this script once during initial setup and after schema changes.
 *
 * Usage:
 *   npx ts-node scripts/create-indexes.ts
 *   # or
 *   npm run db:indexes
 *
 * Why these indexes matter:
 * - Compound indexes speed up queries that filter on multiple fields
 * - Sort indexes avoid in-memory sorting which is slow for large datasets
 * - Unique indexes prevent duplicate data and speed up lookups
 */

import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "refocus";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set");
  process.exit(1);
}

interface IndexDefinition {
  name: string;
  keys: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    background?: boolean;
  };
}

interface CollectionIndexes {
  collection: string;
  indexes: IndexDefinition[];
}

/**
 * Define all indexes for the application
 */
const INDEX_DEFINITIONS: CollectionIndexes[] = [
  {
    collection: "messages",
    indexes: [
      {
        // Primary index for 1-on-1 chat queries
        // Supports: GET /api/chat/:friendId (fetching messages between two users)
        name: "messages_chat_lookup",
        keys: { from_user_id: 1, to_user_id: 1, created_at: -1 },
      },
      {
        // Reverse lookup for bidirectional chat queries
        name: "messages_chat_lookup_reverse",
        keys: { to_user_id: 1, from_user_id: 1, created_at: -1 },
      },
      {
        // Index for unread message counts
        // Supports: GET /api/chat/unread-counts
        name: "messages_unread",
        keys: { to_user_id: 1, read_at: 1 },
        options: { sparse: true },
      },
      {
        // Index for session request updates
        name: "messages_session_request",
        keys: { "payload.sessionRequestId": 1 },
        options: { sparse: true },
      },
    ],
  },
  {
    collection: "global_messages",
    indexes: [
      {
        // Primary index for global chat pagination
        // Supports: GET /api/global-chat (fetching latest messages)
        name: "global_messages_timeline",
        keys: { created_at: -1 },
      },
      {
        // Index for user's own messages (for deletion)
        name: "global_messages_user",
        keys: { user_id: 1, created_at: -1 },
      },
    ],
  },
  {
    collection: "session_requests",
    indexes: [
      {
        // Index for outgoing requests
        name: "session_requests_from_user",
        keys: { from_user_id: 1, status: 1, created_at: -1 },
      },
      {
        // Index for incoming requests
        name: "session_requests_to_user",
        keys: { to_user_id: 1, status: 1, created_at: -1 },
      },
    ],
  },
  {
    collection: "sessions",
    indexes: [
      {
        // Index for user's sessions (calendar view)
        name: "sessions_owner",
        keys: { owner_id: 1, start_time: 1 },
      },
      {
        // Index for participant lookups
        name: "sessions_participants",
        keys: { "session_participants.user_id": 1, start_time: 1 },
      },
      {
        // Index for upcoming sessions
        name: "sessions_upcoming",
        keys: { start_time: 1, status: 1 },
      },
    ],
  },
  {
    collection: "users",
    indexes: [
      {
        // Unique email index for authentication
        name: "users_email_unique",
        keys: { email: 1 },
        options: { unique: true },
      },
      {
        // Unique username index for public profiles
        name: "users_username_unique",
        keys: { username: 1 },
        options: { unique: true, sparse: true },
      },
    ],
  },
  {
    collection: "friends",
    indexes: [
      {
        // Index for friend lookups
        name: "friends_user_lookup",
        keys: { user_id: 1, friend_id: 1 },
        options: { unique: true },
      },
      {
        // Reverse lookup
        name: "friends_reverse_lookup",
        keys: { friend_id: 1, user_id: 1 },
      },
    ],
  },
  {
    collection: "friend_requests",
    indexes: [
      {
        // Index for pending requests
        name: "friend_requests_pending",
        keys: { to_user_id: 1, status: 1, created_at: -1 },
      },
      {
        // Index for sent requests
        name: "friend_requests_sent",
        keys: { from_user_id: 1, status: 1, created_at: -1 },
      },
    ],
  },
];

/**
 * Create indexes for a collection
 */
async function createCollectionIndexes(
  db: Db,
  collectionDef: CollectionIndexes,
): Promise<void> {
  const { collection, indexes } = collectionDef;

  console.log(`\n📁 Collection: ${collection}`);

  // Ensure collection exists
  const collections = await db.listCollections({ name: collection }).toArray();
  if (collections.length === 0) {
    console.log(`   Creating collection...`);
    await db.createCollection(collection);
  }

  // Get existing indexes
  const existingIndexes = await db.collection(collection).indexes();
  const existingNames = new Set(existingIndexes.map((idx) => idx.name));

  for (const indexDef of indexes) {
    if (existingNames.has(indexDef.name)) {
      console.log(`   ⏭️  Index "${indexDef.name}" already exists`);
      continue;
    }

    try {
      await db.collection(collection).createIndex(indexDef.keys, {
        name: indexDef.name,
        background: true, // Non-blocking index creation
        ...indexDef.options,
      });
      console.log(`   ✅ Created index "${indexDef.name}"`);
    } catch (error) {
      console.error(`   ❌ Failed to create index "${indexDef.name}":`, error);
    }
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  console.log("🚀 Starting MongoDB Index Migration");
  console.log(`   Database: ${MONGODB_DB}`);
  console.log("─".repeat(50));

  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(MONGODB_DB);

    for (const collectionDef of INDEX_DEFINITIONS) {
      await createCollectionIndexes(db, collectionDef);
    }

    console.log("\n" + "─".repeat(50));
    console.log("✅ Index migration completed successfully!");
    console.log(
      "\nTip: Run db.collection.getIndexes() in MongoDB shell to verify.",
    );
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the migration
runMigration();
