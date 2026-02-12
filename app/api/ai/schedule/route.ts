import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const ProposedSessionSchema = z.object({
  sessions: z.array(
    z.object({
      date: z
        .string()
        .describe("ISO date string YYYY-MM-DD for the session"),
      startHour: z
        .number()
        .min(0)
        .max(23)
        .describe("Start hour in 24h format"),
      startMinute: z
        .number()
        .min(0)
        .max(59)
        .describe("Start minute, default 0"),
      durationMin: z
        .enum(["25", "50", "75"])
        .describe("Duration in minutes — must be 25, 50, or 75"),
      sessionType: z
        .enum(["focus", "deep-work", "learning"])
        .describe(
          "Session type. Use 'learning' for studying/exams, 'deep-work' for creative/coding work, 'focus' otherwise"
        ),
      goal: z
        .string()
        .describe(
          "A clear, actionable SMART goal for this session (max 15 words, starts with action verb)"
        ),
    })
  ),
  friendName: z
    .string()
    .nullable()
    .describe(
      "If the user mentioned a specific friend by name, return that name here. Otherwise null."
    ),
  reasoning: z
    .string()
    .describe(
      "One-sentence explanation of how you interpreted the request"
    ),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { message } = body as { message?: string };

  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  const db = await getDb();

  const friendRequests = await db
    .collection<{
      from_user_id: string;
      to_user_id: string;
      status: string;
    }>("friend_requests")
    .find({
      status: "accepted",
      $or: [{ from_user_id: userId }, { to_user_id: userId }],
    })
    .toArray();

  const friendIds = [
    ...new Set(
      friendRequests.map((r) =>
        r.from_user_id === userId ? r.to_user_id : r.from_user_id
      )
    ),
  ];

  let friendsList: { id: string; name: string }[] = [];
  if (friendIds.length > 0) {
    const friendDocs = await db
      .collection<{ _id: ObjectId; name?: string; email?: string }>("users")
      .find({ _id: { $in: friendIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1, email: 1 })
      .toArray();
    friendsList = friendDocs.map((f) => ({
      id: String(f._id),
      name: (f.name as string) || (f.email as string) || String(f._id),
    }));
  }

  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 8);

  const busySessions = await db
    .collection<{
      start_time: Date;
      end_time: Date;
      session_participants?: Array<{ user_id: string }>;
    }>("sessions")
    .find({
      "session_participants.user_id": userId,
      start_time: { $lt: to },
      end_time: { $gt: from },
    })
    .project({ start_time: 1, end_time: 1 })
    .toArray();

  const busySlotsSummary = busySessions.map((s) => ({
    start: s.start_time.toISOString(),
    end: s.end_time.toISOString(),
  }));

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const upcomingDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    upcomingDays.push(
      `${dayNames[d.getDay()]} ${d.toISOString().split("T")[0]}`
    );
  }

  const systemPrompt = `You are a smart scheduling assistant for a virtual coworking platform called Refocus. The current date and time is ${now.toISOString()}.

Your job: parse the user's natural-language request into concrete session proposals.

Context:
- Today is ${dayNames[now.getDay()]}, ${now.toISOString().split("T")[0]}
- The next 7 days are: ${upcomingDays.join(", ")}
- User's existing busy slots: ${busySlotsSummary.length > 0 ? JSON.stringify(busySlotsSummary) : "None (fully free)"}
- User's friends: ${friendsList.length > 0 ? friendsList.map((f) => f.name).join(", ") : "No friends yet"}
- Available session durations: 25min, 50min, or 75min (default to 50 if not specified)
- Available session types: focus, deep-work, learning

Rules:
1. AVOID scheduling over the user's existing busy slots.
2. If the user says "evening", schedule at 18:00. "Morning" = 09:00. "Afternoon" = 14:00. "Night" = 20:00.
3. If the user says "this week", spread sessions across remaining weekdays.
4. If the user says "tomorrow", use the next calendar date.
5. Create clear, actionable SMART goals starting with an action verb. Max 15 words.
6. Never schedule in the past.
7. If the request is unclear, make reasonable assumptions and explain in reasoning.`;

  try {
    let result;

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not found");
      }

      result = await generateObject({
        model: openai("gpt-4o"),
        schema: ProposedSessionSchema,
        system: systemPrompt,
        prompt: message,
      });
    } catch (openaiError) {
      console.warn(
        "OpenAI failed, falling back to Gemini:",
        openaiError
      );

      result = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: ProposedSessionSchema,
        system: systemPrompt,
        prompt: message,
      });
    }

    const parsed = result.object;

    let matchedFriend: { id: string; name: string } | null = null;
    if (parsed.friendName) {
      const lower = parsed.friendName.toLowerCase();
      matchedFriend =
        friendsList.find((f) =>
          f.name.toLowerCase().includes(lower)
        ) ?? null;
    }

    const proposals = parsed.sessions.map((s) => {
      const startDate = new Date(`${s.date}T00:00:00`);
      startDate.setHours(s.startHour, s.startMinute, 0, 0);

      const durMin = parseInt(s.durationMin, 10) as 25 | 50 | 75;
      const endDate = new Date(startDate.getTime() + durMin * 60_000);

      return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        durationMin: durMin,
        sessionType: s.sessionType,
        goal: s.goal,
        isPast: startDate <= now,
      };
    });

    // Hard filter: remove past sessions AND any that overlap with the user's busy slots
    const overlaps = (
      aStart: number,
      aEnd: number,
      bStart: number,
      bEnd: number
    ) => aStart < bEnd && aEnd > bStart;

    const validProposals = proposals.filter((p) => {
      if (p.isPast) return false;

      const pStart = new Date(p.start).getTime();
      const pEnd = new Date(p.end).getTime();

      // Check against existing busy slots
      for (const slot of busySlotsSummary) {
        if (
          overlaps(
            pStart,
            pEnd,
            new Date(slot.start).getTime(),
            new Date(slot.end).getTime()
          )
        ) {
          return false;
        }
      }

      for (const other of proposals) {
        if (other === p || other.isPast) continue;
        const oStart = new Date(other.start).getTime();
        const oEnd = new Date(other.end).getTime();
        if (overlaps(pStart, pEnd, oStart, oEnd) && proposals.indexOf(p) > proposals.indexOf(other)) {
          return false;
        }
      }

      return true;
    });

    return NextResponse.json({
      proposals: validProposals,
      friend: matchedFriend,
      reasoning: parsed.reasoning,
      totalRequested: parsed.sessions.length,
      totalValid: validProposals.length,
    });
  } catch (error) {
    console.error("AI schedule error:", error);
    return NextResponse.json(
      { error: "Failed to process scheduling request" },
      { status: 500 }
    );
  }
}
