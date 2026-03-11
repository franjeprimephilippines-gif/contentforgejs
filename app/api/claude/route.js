// app/api/claude/route.js
// Next.js App Router API route — secure server-side proxy for Anthropic API.
// ANTHROPIC_API_KEY lives in .env.local, never exposed to the browser.

import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to your .env.local file or Vercel environment variables." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: `Invalid JSON body: ${e.message}` }, { status: 400 });
  }

  try {
    const bodyTools = body?.tools || [];
    const usesWebSearch = bodyTools.some((t) => t.name === "web_search");

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    if (usesWebSearch) {
      headers["anthropic-beta"] = "web-search-2025-03-05";
    }

    // Strip max_uses from tools — not a valid Anthropic API field, causes 400
    if (body.tools) {
      body.tools = body.tools.map(({ max_uses, ...rest }) => rest);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Log Anthropic errors server-side for easier debugging
    if (!response.ok) {
      console.error("Anthropic API error:", response.status, JSON.stringify(data));
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("Route handler error:", err.message);
    return NextResponse.json(
      { error: "Failed to reach Anthropic API", detail: err.message },
      { status: 502 }
    );
  }
}
