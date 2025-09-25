import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribe, userChannel } from "@/lib/sse";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return new Response("Unauthorized", { status: 401 });

  const channel = userChannel(currentUserId);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      send({ type: "hello" });
      const off = subscribe(channel, (ev) => send(ev));
      const iv = setInterval(() => send({ type: "ping", t: Date.now() }), 25000);
      controller.signal.addEventListener("abort", () => {
        clearInterval(iv);
        off();
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


