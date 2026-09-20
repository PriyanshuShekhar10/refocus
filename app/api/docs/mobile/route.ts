import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

function catalogPath() {
  return join(process.cwd(), "docs", "mobile-api.json");
}

function markdownPath() {
  return join(process.cwd(), "docs", "mobile-api.md");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Public machine-readable Refocus mobile API catalog for AI / native clients. */
export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();

  try {
    if (format === "md" || format === "markdown") {
      const md = readFileSync(markdownPath(), "utf8");
      return new NextResponse(md, {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "text/markdown; charset=utf-8",
        },
      });
    }

    const raw = readFileSync(catalogPath(), "utf8");
    // Validate JSON then re-emit (keeps bad deploys from serving truncated files)
    JSON.parse(raw);
    return new NextResponse(raw, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("[api/docs/mobile]", err);
    return NextResponse.json(
      { error: "Catalog unavailable" },
      { status: 500, headers: CORS },
    );
  }
}
