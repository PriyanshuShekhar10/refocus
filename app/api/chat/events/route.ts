// no imports needed
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribe, userChannel } from "@/lib/sse";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return new Response("Unauthorized", { status: 401 });

  const channel = userChannel(currentUserId);
  let pingInterval: NodeJS.Timeout | null = null;
  let unsub: (() => void) | null = null;
  let isStreamClosed = false;

  const cleanup = () => {
    isStreamClosed = true;
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (unsub) {
      unsub();
      unsub = null;
    }
  };

  req.signal.addEventListener("abort", cleanup);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      send({ type: "hello" });
      unsub = subscribe(channel, (ev) => send(ev));
      pingInterval = setInterval(() => send({ type: "ping", t: Date.now() }), 25000);
    },
    cancel() {
      cleanup();
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


