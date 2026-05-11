import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatChannel, subscribe } from "@/lib/sse";
import { areFriends } from "@/lib/friendship";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> },
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { friendId } = await params;

  if (!(await areFriends(currentUserId, friendId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const channel = chatChannel(currentUserId, friendId);

  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          if (pingInterval) clearInterval(pingInterval);
          if (unsub) unsub();
        }
      };

      send({ type: "hello" });
      unsub = subscribe(channel, (event) => send(event));
      pingInterval = setInterval(
        () => send({ type: "ping", t: Date.now() }),
        25000,
      );
    },
    cancel() {
      if (pingInterval) clearInterval(pingInterval);
      if (unsub) unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
