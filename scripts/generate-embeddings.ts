import { MongoClient, ObjectId } from "mongodb";
import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import dotenv from "dotenv";
import path from "path";

// Load both .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  console.log(`API Keys: Gemini=${geminiKey ? "SET" : "MISSING"}, OpenAI=${openaiKey ? "SET" : "MISSING"}`);
  if (!geminiKey && !openaiKey) throw new Error("Need either GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY");

  // Set Gemini key explicitly if present (AI SDK reads from env)
  if (geminiKey && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = geminiKey;
  }

  const client = new MongoClient(uri);
  await client.connect();
  console.log("Connected to MongoDB");
  
  const dbName = process.env.MONGODB_DB || "refocus";
  const db = client.db(dbName);
  console.log(`Using database: "${dbName}"`);
  const users = await db.collection("users").find({}).toArray();
  
  console.log(`Found ${users.length} users. Checking for missing embeddings...`);

  for (const user of users) {
    if (user.embedding) {
      console.log(`- User ${user.email} already has embedding. Skipping.`);
      continue;
    }

    console.log(`- Generating embedding for ${user.email}...`);
    
    const finalFirst = user.firstname ?? "";
    const finalLast = user.lastname ?? "";
    const finalAbout = user.about ?? "";
    const finalInterests = user.interests ?? [];
    
    const textToEmbed = `Name: ${finalFirst} ${finalLast}. About: ${finalAbout}. Interests: ${finalInterests ? finalInterests.join(", ") : ""}.`;

    try {
        const embeddingModel = geminiKey
            ? google.textEmbeddingModel("text-embedding-004")
            : openai.embedding("text-embedding-3-small");
        const { embedding } = await embed({
            model: embeddingModel,
            value: textToEmbed,
        });

        await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { embedding } }
        );
        console.log("  Success!");
    } catch (e) {
        console.error("  Failed:", e);
    }
  }

  console.log("Done!");
  await client.close();
}

main().catch(console.error);
