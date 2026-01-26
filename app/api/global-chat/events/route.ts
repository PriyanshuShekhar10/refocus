import { globalChatChannel, subscribe } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return new Response("Unauthorized", { status: 401 });

  const channel = globalChatChannel();
  let unsubscribe: (() => void) | null = null;
  let pingInterval: NodeJS.Timeout | null = null;
  let isStreamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller is closed
          cleanup();
        }
      };

      // Subscribe to channel events
      unsubscribe = subscribe(channel, (event) => send(event));

      // Send initial hello
      send({ type: "hello" });

      // Keep-alive ping every 25 seconds
      pingInterval = setInterval(() => {
        send({ type: "ping", t: Date.now() });
      }, 25000);
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    isStreamClosed = true;
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}


