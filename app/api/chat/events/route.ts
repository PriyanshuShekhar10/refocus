// no imports needed
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribe, userChannel } from "@/lib/sse";

export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return new Response("Unauthorized", { status: 401 });

  const channel = userChannel(currentUserId);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      send({ type: "hello" });
      subscribe(channel, (ev) => send(ev));
      setInterval(() => send({ type: "ping", t: Date.now() }), 25000);
      // best-effort cleanup on GC; the platform may not expose an abort signal here
      // rely on client disconnect closing the stream implicitly
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


