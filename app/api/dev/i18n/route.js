import { watch } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Dev-only: tell the browser when a locale catalog changes. */
export function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const dir = path.join(process.cwd(), "messages");
  let watcher;
  let timer;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      try {
        watcher = watch(dir, (_event, filename) => {
          if (closed || !filename || !String(filename).endsWith(".json")) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (closed) return;
            controller.enqueue(encoder.encode(`data: ${Date.now()}\n\n`));
          }, 150);
        });
      } catch {
        controller.close();
        return;
      }
      watcher.on("error", () => {
        if (!closed) controller.close();
      });
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
      watcher?.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
