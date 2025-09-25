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

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // initial hello
      send({ type: "hello" });

      // subscribe to channel
      const unsubscribe = subscribe(channel, (event) => {
        send(event);
      });

      // keepalive
      const iv = setInterval(() => {
        try {
          send({ type: "ping", t: Date.now() });
        } catch {}
      }, 25000);

      controller.signal.addEventListener("abort", () => {
        clearInterval(iv);
        unsubscribe();
      });
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


