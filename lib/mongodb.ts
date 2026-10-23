import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  throw new Error("Missing MONGODB_URI env var");
}

// Catch common placeholder mistakes early to provide clearer errors than a DNS SRV failure.
if (
  /mongodb\+srv:\/\/.*<cluster>/i.test(uri) ||
  uri.includes("<user>") ||
  uri.includes("<pass>")
) {
  throw new Error(
    "Invalid MONGODB_URI: replace placeholders with real values. Example: mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/refocus?retryWrites=true&w=majority or mongodb://127.0.0.1:27017/refocus"
  );
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const client = new MongoClient(uri);
  const promise = client.connect();
  // If the initial connect fails, don't leave the rejected promise cached —
  // every future getDb() call on this warm serverless instance would await
  // the same rejection forever instead of retrying. Clear it so the next
  // call gets a fresh connection attempt.
  promise.catch(() => {
    if (global._mongoClientPromise === promise) {
      global._mongoClientPromise = undefined;
    }
  });
  return promise;
}

if (!global._mongoClientPromise) {
  global._mongoClientPromise = connect();
}
// Kept as a plain Promise (not a function) — @auth/mongodb-adapter's
// MongoDBAdapter(clientPromise) in lib/auth.ts expects this exact shape.
const clientPromise = global._mongoClientPromise;

export default clientPromise;

export async function getDb(dbName = process.env.MONGODB_DB || "refocus") {
  // Re-read the global on every call (rather than closing over the
  // snapshot above) so a self-healed reconnect after a failed `connect()`
  // is picked up by callers here, even though the default export above
  // stays pinned to its original promise for the NextAuth adapter.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect();
  }
  const client = await global._mongoClientPromise;
  return client.db(dbName);
}
