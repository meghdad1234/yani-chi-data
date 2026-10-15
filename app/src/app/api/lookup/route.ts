import { NextRequest, NextResponse } from "next/server";
import { lookupEntries } from "../../../lib/wikidb";
import { normFa } from "../../../lib/normFa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length > 60 || !normFa(q)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  try {
    const entries = lookupEntries(q).map((e) => ({
      ...e,
      source: {
        name: "Wiktionary",
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(e.word)}#Persian`,
        license: "CC BY-SA 4.0",
      },
    }));
    return NextResponse.json(
      { found: entries.length > 0, query: q, entries },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (e) {
    console.error("lookup failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
}
