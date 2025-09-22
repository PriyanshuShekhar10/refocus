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
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
export async function getDb(dbName = process.env.MONGODB_DB || "refocus") {
  const client = await clientPromise;
  return client.db(dbName);
}
