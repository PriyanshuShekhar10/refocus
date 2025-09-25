import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatChannel, subscribe } from "@/lib/sse";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { friendId } = await params;
  const channel = chatChannel(currentUserId, friendId);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // initial hello
      send({ type: "hello" });

      // subscribe to channel
      subscribe(channel, (event) => {
        send(event);
      });

      // keepalive (no explicit cleanup; client disconnect will end stream)
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


