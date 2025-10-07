// app/api/messages/stream/route.ts
// Simple SSE endpoint to notify clients of new chat activity.
// For MVP, emits a heartbeat tick every 3s; clients then fetch /api/messages.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // do not prerender
export const revalidate = 0; // no caching

export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Initial hello
      send("hello", JSON.stringify({ ok: true, ts: Date.now() }));

      const interval = setInterval(() => {
        try {
          send("tick", JSON.stringify({ ts: Date.now() }));
        } catch {}
      }, 3000);

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:\n\n`)); // comment ping
        } catch {}
      }, 15000);

      const close = () => {
        clearInterval(interval);
        clearInterval(keepalive);
        try { controller.close(); } catch {}
      };

      // @ts-ignore - not in type yet
      (controller as any)._onClose = close;
    },
    cancel() {
      // no-op
    },
  });

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
