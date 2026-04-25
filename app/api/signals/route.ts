import { NextResponse } from "next/server";
import { buildSignalPage } from "@/lib/signals";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");

  if (Number.isNaN(page) || page < 1 || Number.isNaN(pageSize) || pageSize < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters. page and pageSize must be positive integers." },
      { status: 400 }
    );
  }

  const feed = buildSignalPage(page, pageSize);
  return NextResponse.json(feed, { status: 200 });
}
