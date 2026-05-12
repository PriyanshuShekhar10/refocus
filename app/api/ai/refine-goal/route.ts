import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, rateLimitedResponse } from '@/lib/ratelimit';

// Simple LRU cache to avoid re-calling the LLM for identical goal strings.
// Keeps the most recent 200 entries. Entries expire after 1 hour.
const CACHE_MAX = 200;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
type CacheEntry = { result: string; ts: number };
const cache = new Map<string, CacheEntry>();

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: string): void {
  // Evict oldest entry if at capacity
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { result, ts: Date.now() });
}

export async function POST(req: Request) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit AI calls
    const rl = await checkRateLimit(userId, 'ai');
    if (!rl.success) {
      return rateLimitedResponse(rl);
    }

    const { goal } = await req.json();

    if (!goal) {
      return Response.json({ error: 'Goal is required' }, { status: 400 });
    }

    // Normalise the goal string for cache lookup
    const cacheKey = goal.trim().toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      return Response.json({ refinedGoal: cached });
    }

    const systemPrompt = `You are an elite productivity coach. Transform the user's vague intention into a clear, high-impact SMART goal suitable for a single focus session.
    Rules:
    1. Start with a strong action verb (e.g. "Complete", "Draft", "Review").
    2. Be specific but concise (max 15 words).
    3. Do NOT use quotation marks.
    4. Do NOT add conversational filler like "Here is your refined goal:".
    5. If the input is nonsense, return "Define a specific task to focus on."
    6. Do not leave variables in the response like "I will complete my website on [specific date]" instead of [specific date], put today or based on context write the date or something specific."
    `;

    const userPrompt = `Refine this session goal: "${goal}"`;

    let text = "";

    try {

      if (!process.env.OPENAI_API_KEY) {
         throw new Error("OPENAI_API_KEY not found");
      }

      const result = await generateText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: userPrompt,
      });
      text = result.text;
    } catch (openaiError) {
      console.warn("OpenAI failed or key missing, attempting fallback to Gemini:", openaiError);
      
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        system: systemPrompt,
        prompt: userPrompt,
      });
      text = result.text;
    }

    // specific cleanup for removing quotes if the model ignores the instruction
    text = text.replace(/^["']|["']$/g, '').trim();

    // Store in cache before returning
    setCache(cacheKey, text);

    return Response.json({ refinedGoal: text });
  } catch (error) {
    console.error('AI Refinement Validation Error:', error);
    return Response.json({ error: 'Failed to refine goal' }, { status: 500 });
  }
}
