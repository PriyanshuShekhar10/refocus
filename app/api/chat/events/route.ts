// no imports needed
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribe, userChannel } from "@/lib/sse";

export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!currentUserId) return new Response("Unauthorized", { status: 401 });

  const channel = userChannel(currentUserId);
  let pingInterval: NodeJS.Timeout | null = null;
  
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller is closed, stop trying to send
          console.log('SSE controller closed, stopping ping interval');
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
        }
      };
      
      send({ type: "hello" });
      subscribe(channel, (ev) => send(ev));
      
      pingInterval = setInterval(() => send({ type: "ping", t: Date.now() }), 25000);
    },
    cancel() {
      // This is called when the client disconnects
      console.log('SSE stream cancelled, cleaning up');
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    }
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


