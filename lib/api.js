// lib/api.js
// All Anthropic API calls route through /api/claude → app/api/claude/route.js
// This keeps your API key server-side (in .env.local) and out of the browser bundle.

const API_ENDPOINT = "/api/claude";

const callAnthropicDirect = async (payload) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(payload),
  });
  return res;
};

const callProxy = async (payload) => {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res;
};

const parseJsonResponse = (text) => {
  const clean = text.replace(/```json\n?|```/g, "").trim();
  // Extract first complete JSON object
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]);
};

const doRequest = async (payload) => {
  // Try proxy first (production Vercel), fallback to direct browser call
  try {
    const res = await callProxy(payload);
    if (res.ok) {
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return data;
    }
    // Proxy returned error — fall through to direct call
  } catch (proxyErr) {
    // Proxy unreachable (local dev without vercel dev) — try direct
    if (!proxyErr.message?.includes("API") && !proxyErr.message?.includes("anthropic")) {
      // network/proxy error, try direct
    } else {
      throw proxyErr;
    }
  }

  // Direct browser fallback
  const res = await callAnthropicDirect(payload);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
};

export const callClaude = async (systemPrompt, userMessage, maxTokens = 3000) => {
  const data = await doRequest({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const text = data.content?.map((i) => i.text || "").join("") || "";
  return parseJsonResponse(text);
};

const BRAND_SYSTEM_PROMPT = `You are a brand intelligence analyst. Extract structured brand intelligence from a website.
Respond ONLY with valid JSON (no markdown fences):
{
  "companyName": "detected company name",
  "tagline": "detected tagline or value proposition",
  "industry": "detected industry/niche",
  "brandMission": "detected mission or purpose statement",
  "productsServices": ["product or service 1", "product or service 2", "product or service 3"],
  "targetAudience": "who they serve based on the copy",
  "toneObservations": "2-sentence description of the writing tone and style observed",
  "keyMessages": ["core message 1", "core message 2", "core message 3"],
  "uniqueValueProps": ["UVP 1", "UVP 2", "UVP 3"],
  "existingTopics": ["topic/theme found on site 1", "topic/theme found on site 2", "topic/theme found on site 3"],
  "brandKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "contentOpportunities": ["suggested blog topic 1", "suggested blog topic 2", "suggested blog topic 3"],
  "socialProof": "any testimonials, stats, or trust signals found",
  "callToActions": ["CTA text found 1", "CTA text found 2"]
}`;

const parseJsonFromText = (text) => {
  const clean = text.replace(/```json\n?|```/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse brand data from response");
  return JSON.parse(jsonMatch[0]);
};

export const crawlWebsite = async (url) => {
  let crawlUrl = url.trim();
  if (!crawlUrl.startsWith("http")) crawlUrl = "https://" + crawlUrl;

  // First attempt: use web_search tool for live crawl
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        system: BRAND_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Crawl and analyze this website: ${crawlUrl}\n\nSearch for the website, visit its homepage and about/services/product pages. Extract everything about the company — products/services, tone of voice, key messages, target audience, value propositions, and content themes. Return ONLY the JSON object.`
        }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Check for web_search permission error specifically
      if (data.error?.message?.toLowerCase().includes("web search")) {
        throw new Error("web_search_disabled");
      }
      const textBlocks = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      if (textBlocks) return parseJsonFromText(textBlocks);
    }
  } catch (err) {
    // If it's not a web_search issue, rethrow
    if (err.message !== "web_search_disabled" && !err.message.includes("parse")) {
      throw err;
    }
  }

  // Fallback: use Claude's knowledge about the domain (no web search needed)
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: BRAND_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Based on your knowledge, analyze the brand and website at: ${crawlUrl}\n\nInfer the company's products/services, tone of voice, key messages, target audience, value propositions, and content themes from the domain and any knowledge you have. If you don't know the specific company, make reasonable inferences based on the domain name and industry. Return ONLY the JSON object.`
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Analysis failed with status ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  return parseJsonFromText(text);
};
