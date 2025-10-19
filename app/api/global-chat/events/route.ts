import { globalChatChannel, subscribe } from "@/lib/sse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return new Response("Unauthorized", { status: 401 });

  const channel = globalChatChannel();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      send({ type: "hello" });
      subscribe(channel, (event) => send(event));

      setInterval(() => {
        try {
          send({ type: "ping", t: Date.now() });
        } catch {}
      }, 25000);
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


