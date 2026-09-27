import { NextResponse } from "next/server";
import { buildSignalPage, buildActivitySummary } from "@/lib/signals";
import { traceWorker } from "@/src/tracing/worker-tracing.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
  const view = url.searchParams.get("view");

  if (
    Number.isNaN(page) ||
    page < 1 ||
    Number.isNaN(pageSize) ||
    pageSize < 1
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid pagination parameters. page and pageSize must be positive integers.",
      },
      { status: 400 }
    );
  }

  if (view === "activity") {
    const activity = await traceWorker(
      "worker:signals:activity",
      async () => buildActivitySummary(page, pageSize),
      { page, pageSize }
    );

    return NextResponse.json(activity, { status: 200 });
  }

  const feed = await traceWorker(
    "worker:signals:fetch",
    async () => buildSignalPage(page, pageSize),
    { page, pageSize }
  );

  return NextResponse.json(feed, { status: 200 });
}
