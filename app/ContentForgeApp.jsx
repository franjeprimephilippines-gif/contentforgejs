"use client";
import { useState, useEffect, useRef } from "react";
import { callClaude, crawlWebsite } from "../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { id: "eeat", label: "E-E-A-T", icon: "🏆", desc: "Experience · Expertise · Authority · Trust", prompt: "Write with first-person experience signals, cite expertise, build authority with data, and include trust indicators like author credentials and sources." },
  { id: "thought_leadership", label: "Thought Leadership", icon: "💡", desc: "Original insights & industry perspective", prompt: "Write with bold original opinions, industry predictions, and unique frameworks. Position the author as an industry pioneer with contrarian or forward-looking views." },
  { id: "how_to", label: "How-To / Tutorial", icon: "📋", desc: "Step-by-step actionable guide", prompt: "Write a clear, actionable step-by-step guide with numbered steps, pro tips, common mistakes to avoid, and a clear outcome statement." },
  { id: "listicle", label: "Listicle", icon: "📝", desc: "Ranked list with deep insights", prompt: "Write a well-researched numbered list with substantial explanations per item. Include a compelling intro and summary." },
  { id: "pillar", label: "Pillar / Ultimate Guide", icon: "🏛️", desc: "Comprehensive cornerstone content", prompt: "Write an exhaustive comprehensive guide covering all aspects. Include definitions, history, use cases, comparisons, and FAQs." },
  { id: "geo_ai", label: "GEO / AI-First", icon: "🤖", desc: "Optimized for AI answer engines", prompt: "Write in a highly structured citable format ideal for AI answer engines. Use clear definitions, concise factual statements, structured Q&A sections." },
  { id: "comparison", label: "Comparison / VS", icon: "⚖️", desc: "Side-by-side analysis", prompt: "Write a balanced in-depth comparison covering key criteria. Include summary table, pros/cons, use-case recommendations, and a clear verdict." },
  { id: "case_study", label: "Case Study", icon: "📊", desc: "Story-driven results & proof", prompt: "Write a compelling case study with problem/solution/results structure. Include specific metrics, quotes, timelines, and lessons learned." },
];

const TONES = ["Professional", "Conversational", "Authoritative", "Friendly", "Academic", "Bold & Direct"];
const AUDIENCES = ["Beginners", "Intermediate practitioners", "Experts & professionals", "C-Suite / Decision makers", "General public", "Technical developers"];

const NAV_ITEMS = [
  { id: "brand_voice", label: "Brand Voice", icon: "🎨" },
  { id: "create", label: "Create", icon: "✦" },
  { id: "keyword_gap", label: "Keyword Gap", icon: "🔍" },
  { id: "competitor", label: "Competitor Analysis", icon: "⚖️" },
  { id: "export", label: "CMS Export", icon: "📤" },
];

const PERSONALITY_TRAITS = [
  { id: "formal_casual", left: "Formal", right: "Casual" },
  { id: "serious_playful", left: "Serious", right: "Playful" },
  { id: "technical_simple", left: "Technical", right: "Simple" },
  { id: "reserved_bold", left: "Reserved", right: "Bold" },
  { id: "traditional_innovative", left: "Traditional", right: "Innovative" },
];

const VOICE_ARCHETYPES = [
  { id: "expert", label: "The Expert", icon: "🎓", desc: "Authoritative, data-driven, builds trust through knowledge" },
  { id: "mentor", label: "The Mentor", icon: "🤝", desc: "Warm, guiding, empowers readers to grow" },
  { id: "rebel", label: "The Rebel", icon: "⚡", desc: "Challenges the status quo, provocative, opinionated" },
  { id: "storyteller", label: "The Storyteller", icon: "📖", desc: "Narrative-first, emotionally engaging, relatable" },
  { id: "analyst", label: "The Analyst", icon: "📊", desc: "Methodical, objective, evidence-based writing" },
  { id: "innovator", label: "The Innovator", icon: "🚀", desc: "Forward-thinking, energetic, focuses on what's next" },
];

const DEFAULT_BRAND_VOICE = {
  companyName: "",
  industry: "",
  tagline: "",
  archetype: "expert",
  traits: { formal_casual: 40, serious_playful: 25, technical_simple: 50, reserved_bold: 60, traditional_innovative: 65 },
  dos: ["Use clear, concise language", "Back claims with data", "Speak directly to the reader"],
  donts: ["Use jargon without explanation", "Be overly promotional", "Use passive voice"],
  forbiddenWords: ["synergy", "leverage", "paradigm shift"],
  signaturePhrases: [],
  targetEmotion: "Informed and empowered",
  brandMission: "",
  websiteUrl: "",
  crawlData: null,
  saved: false,
};

// ─── Prompts ──────────────────────────────────────────────────────────────────

const buildSeoPrompt = (brandVoice) => {
  const bv = brandVoice?.saved ? `
BRAND VOICE GUIDELINES — follow these strictly throughout the entire post:
- Company: ${brandVoice.companyName || "the brand"}${brandVoice.industry ? ` (${brandVoice.industry})` : ""}
- Voice archetype: ${VOICE_ARCHETYPES.find(a => a.id === brandVoice.archetype)?.label} — ${VOICE_ARCHETYPES.find(a => a.id === brandVoice.archetype)?.desc}
- Personality: ${PERSONALITY_TRAITS.map(t => {
    const v = brandVoice.traits[t.id];
    if (v < 30) return t.left;
    if (v > 70) return t.right;
    return `balanced ${t.left}/${t.right}`;
  }).join(", ")}
- Target reader emotion: ${brandVoice.targetEmotion}
${brandVoice.brandMission ? `- Brand mission: ${brandVoice.brandMission}` : ""}
- ALWAYS DO: ${brandVoice.dos.join("; ")}
- NEVER DO: ${brandVoice.donts.join("; ")}
${brandVoice.forbiddenWords.length ? `- FORBIDDEN WORDS (never use): ${brandVoice.forbiddenWords.join(", ")}` : ""}
${brandVoice.signaturePhrases.length ? `- Signature phrases to weave in naturally: ${brandVoice.signaturePhrases.join(", ")}` : ""}
` : "";

  const cd = brandVoice?.crawlData ? `
WEBSITE INTELLIGENCE (extracted from ${brandVoice.websiteUrl}) — use this to make content hyper-relevant to this brand:
- Products/Services to naturally reference or promote: ${brandVoice.crawlData.productsServices?.join(", ")}
- Target audience: ${brandVoice.crawlData.targetAudience}
- Key brand messages to reinforce: ${brandVoice.crawlData.keyMessages?.join("; ")}
- Unique value propositions to highlight: ${brandVoice.crawlData.uniqueValueProps?.join("; ")}
- Brand keywords to weave in: ${brandVoice.crawlData.brandKeywords?.join(", ")}
- Observed tone: ${brandVoice.crawlData.toneObservations}
${brandVoice.crawlData.socialProof ? `- Social proof/trust signals to reference: ${brandVoice.crawlData.socialProof}` : ""}
${brandVoice.crawlData.callToActions?.length ? `- Preferred CTAs: ${brandVoice.crawlData.callToActions.join(" / ")}` : ""}
` : "";

  return `You are a world-class Content Strategist and SEO/GEO/GAO expert. Write blog content that ranks in search engines AND gets cited by AI answer engines like ChatGPT, Perplexity, and Google AI Overviews.
${bv}${cd}
Always: start with a compelling hook, include primary keyword in first 100 words, use ## H2 and ### H3 subheadings, write short paragraphs (2-4 sentences), include data points, end with a CTA, structure for AI featured snippet capture.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{
  "title": "SEO-optimized H1 title",
  "metaDescription": "155-char meta description with keyword",
  "focusKeyword": "primary keyword phrase",
  "lsiKeywords": ["kw1","kw2","kw3","kw4","kw5"],
  "schemaType": "Article|HowTo|FAQPage|ListItem",
  "estimatedReadTime": "X min read",
  "wordCount": number,
  "content": "Full markdown blog post",
  "faqSection": [{"question":"Q?","answer":"A"},{"question":"Q?","answer":"A"},{"question":"Q?","answer":"A"}],
  "seoScore": {
    "overall": <integer 0-100, weighted average of the 5 sub-scores below>,
    "keywordOptimization": <integer 0-100: did the focus keyword appear in title, first 100 words, at least 2 subheadings, and naturally throughout? Deduct for keyword stuffing or absence>,
    "readability": <integer 0-100: are paragraphs short (2-4 sentences)? Is sentence length varied? Is vocabulary appropriate for the target audience? Is the hook compelling?>,
    "structure": <integer 0-100: does the post have a clear intro/body/conclusion? Are H2/H3 subheadings used properly? Is there a CTA? Are lists or examples used where helpful?>,
    "geoReadiness": <integer 0-100: are there direct answer sentences suitable for AI snippet extraction? Are there definition blocks, numbered steps, or Q&A patterns? Is the content citable and factual?>,
    "eeatSignals": <integer 0-100: are there experience/expertise signals (data, examples, credentials)? Is the author voice authoritative? Are claims supported? Is there a trust-building element?>
  },
  "optimizationTips": ["specific actionable tip based on actual weaknesses found in the content above","tip2","tip3"]
}`;
};

const KEYWORD_GAP_PROMPT = `You are an elite SEO keyword strategist. Analyze the given topic and competitor context to find keyword gaps and opportunities.

Respond ONLY with valid JSON (no markdown fences):
{
  "primaryKeyword": "main keyword",
  "keywordClusters": [
    {
      "theme": "Cluster theme name",
      "intent": "informational|navigational|transactional|commercial",
      "keywords": [
        {"keyword": "kw phrase", "difficulty": 45, "searchVolume": "2.4K/mo", "opportunity": "high|medium|low", "gap": true}
      ]
    }
  ],
  "quickWins": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "longTailGems": ["long tail 1","long tail 2","long tail 3","long tail 4"],
  "contentGaps": ["topic gap 1","topic gap 2","topic gap 3"],
  "totalOpportunities": number,
  "competitorWeaknesses": ["weakness 1","weakness 2","weakness 3"]
}`;

const COMPETITOR_PROMPT = `You are a world-class competitive content analyst. Compare the given content topic against typical competitor approaches.

Respond ONLY with valid JSON (no markdown fences):
{
  "ourStrengths": ["strength 1","strength 2","strength 3","strength 4"],
  "ourWeaknesses": ["weakness 1","weakness 2","weakness 3"],
  "competitorProfiles": [
    {
      "type": "Typical Competitor Type (e.g. Industry Blog, News Site, SaaS Company)",
      "approach": "How they typically cover this topic",
      "wordCountRange": "1200-2000",
      "contentGaps": ["gap 1","gap 2"],
      "differentiators": ["diff 1","diff 2"],
      "eeatScore": 72,
      "seoScore": 80,
      "geoScore": 65
    }
  ],
  "winningAngles": ["angle 1","angle 2","angle 3","angle 4"],
  "contentDifferentiators": ["diff 1","diff 2","diff 3"],
  "recommendedWordCount": number,
  "uniqueValueProps": ["uvp 1","uvp 2","uvp 3"],
  "overallCompetitiveScore": number,
  "recommendation": "2-3 sentence strategic recommendation"
}`;

const CRAWL_PROMPT = `You are a brand intelligence analyst. You will be given raw HTML/text scraped from a company website. Extract structured brand intelligence.

Respond ONLY with valid JSON (no markdown fences, no preamble):
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

// callClaude and crawlWebsite are imported from ./api.js

const scoreColor = (v) => v >= 85 ? "#10b981" : v >= 70 ? "#f59e0b" : "#ef4444";
const intentColor = (i) => ({ informational: "#6366f1", navigational: "#8b5cf6", transactional: "#10b981", commercial: "#f59e0b" }[i] || "#475569");
const opportunityColor = (o) => ({ high: "#10b981", medium: "#f59e0b", low: "#64748b" }[o] || "#64748b");

// ─── Sub-Components ───────────────────────────────────────────────────────────

const ScoreBar = ({ label, value }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(value), fontFamily: "monospace" }}>{value}</span>
    </div>
    <div style={{ background: "#1e293b", borderRadius: 99, height: 5 }}>
      <div style={{ width: `${value}%`, height: "100%", background: `linear-gradient(90deg, ${scoreColor(value)}88, ${scoreColor(value)})`, borderRadius: 99, transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  </div>
);

const Tag = ({ children, color = "#6366f1" }) => (
  <span style={{ fontSize: 10, padding: "3px 8px", background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 4, color, fontFamily: "monospace", letterSpacing: "0.5px" }}>{children}</span>
);

const Panel = ({ children, style = {} }) => (
  <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 24, ...style }}>{children}</div>
);

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: "#334155", fontFamily: "monospace", marginBottom: 14 }}>{children}</div>
);

const Spinner = () => (
  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

// ─── Page: Create ─────────────────────────────────────────────────────────────

function CreatePage({ onResult, result, brandVoice }) {
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [audience, setAudience] = useState("Intermediate practitioners");
  const [tone, setTone] = useState("Professional");
  const [contentType, setContentType] = useState("eeat");
  const [wordCount, setWordCount] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("content");
  const [copied, setCopied] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const outputRef = useRef(null);

  const steps = ["Analyzing topic & keyword intent...", "Crafting SEO-optimized structure...", "Generating E-E-A-T signals...", "Optimizing for AI answer engines...", "Finalizing metadata & schema..."];
  const selectedType = CONTENT_TYPES.find((t) => t.id === contentType);

  useEffect(() => {
    let iv;
    if (loading) iv = setInterval(() => setLoadStep((s) => (s + 1) % steps.length), 1800);
    return () => clearInterval(iv);
  }, [loading]);

  const generate = async () => {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setError(""); setLoading(true);
    try {
      const res = await callClaude(buildSeoPrompt(brandVoice),
        `Write a ${wordCount}-word blog post about: "${topic}"\nPrimary keyword: "${keyword || topic}"\nAudience: ${audience}\nTone: ${tone}\nFramework: ${selectedType.label} — ${selectedType.prompt}`, 4000);
      onResult(res);
      setActiveTab("content");
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setError(`Generation failed: ${e.message || "Please try again."}`); }
    finally { setLoading(false); }
  };

  const copyContent = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = (content) => content.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} style={{ color: "#c7d2fe", fontSize: 15, fontWeight: 700, margin: "18px 0 7px", letterSpacing: "-0.2px" }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, margin: "26px 0 9px", borderLeft: "3px solid #6366f1", paddingLeft: 12, letterSpacing: "-0.4px" }}>{line.slice(3)}</h2>;
    if (line.startsWith("- ")) return <li key={i} style={{ color: "#94a3b8", marginLeft: 18, marginBottom: 4, fontSize: 14 }}>{line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</li>;
    if (line === "") return <br key={i} />;
    return <p key={i} style={{ marginBottom: 11, fontSize: 14, lineHeight: 1.8, color: "#94a3b8" }}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* Form */}
        <Panel>
          <SectionLabel>Content Brief</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>TOPIC *</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How to build a B2B content strategy in 2025" style={inp} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>FOCUS KEYWORD</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. B2B content strategy" style={{ ...inp, fontFamily: "monospace" }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>CONTENT FRAMEWORK</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {CONTENT_TYPES.map((ct) => (
                <button key={ct.id} onClick={() => setContentType(ct.id)} style={{ textAlign: "left", padding: "9px 12px", borderRadius: 8, border: `1px solid ${contentType === ct.id ? "#6366f1" : "#1a2540"}`, background: contentType === ct.id ? "rgba(99,102,241,0.1)" : "transparent", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 12, color: contentType === ct.id ? "#a5b4fc" : "#64748b", fontFamily: "monospace", display: "flex", gap: 5 }}><span>{ct.icon}</span>{ct.label}</div>
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div><label style={lbl}>TONE</label><select value={tone} onChange={(e) => setTone(e.target.value)} style={sel}>{TONES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label style={lbl}>AUDIENCE</label><select value={audience} onChange={(e) => setAudience(e.target.value)} style={sel}>{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>WORD COUNT: <span style={{ color: "#6366f1" }}>{wordCount}</span></label>
            <input type="range" min={600} max={3000} step={100} value={wordCount} onChange={(e) => setWordCount(+e.target.value)} style={{ width: "100%", accentColor: "#6366f1" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#1e293b", fontFamily: "monospace", marginTop: 3 }}><span>600</span><span>1500</span><span>3000</span></div>
          </div>
          {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 14, padding: "9px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
          <button onClick={generate} disabled={loading} style={{ width: "100%", padding: 13, background: loading ? "#0d1526" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: loading ? "1px solid #1a2540" : "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "-0.2px", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {loading ? <><Spinner />{steps[loadStep]}</> : "✦ Generate Optimized Content"}
          </button>
        </Panel>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel>
            <SectionLabel>Active Framework</SectionLabel>
            <div style={{ fontSize: 26, marginBottom: 7 }}>{selectedType.icon}</div>
            <div style={{ fontSize: 15, color: "#f1f5f9", fontWeight: 700, marginBottom: 5 }}>{selectedType.label}</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{selectedType.desc}</div>
          </Panel>
          <Panel>
            <SectionLabel>Optimization Layers</SectionLabel>
            {[["🔍","SEO","Keywords, metadata, structure"],["🤖","GEO","AI citation & answer optimization"],["⚡","GAO","Generative AI discovery"],["🏆","E-E-A-T","Trust & authority signals"]].map(([icon, label, desc]) => (
              <div key={label} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 15 }}>{icon}</span>
                <div><div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700, fontFamily: "monospace" }}>{label}</div><div style={{ fontSize: 10, color: "#334155" }}>{desc}</div></div>
              </div>
            ))}
          </Panel>
          <Panel style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <div style={{ fontSize: 10, color: "#6366f1", fontFamily: "monospace", letterSpacing: "1px", marginBottom: 7 }}>PRO TIP</div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.7 }}>After generating, head to <strong style={{ color: "#818cf8" }}>Keyword Gap</strong> to find untapped search opportunities, then use <strong style={{ color: "#818cf8" }}>Competitor Analysis</strong> to sharpen your angle.</div>
          </Panel>
        </div>
      </div>

      {/* Output */}
      {result && (
        <div ref={outputRef} style={{ marginTop: 32 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #1a2540", marginBottom: 22, gap: 0 }}>
            {["content","metadata","scores","faq"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "10px 18px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab ? "#6366f1" : "transparent"}`, color: activeTab === tab ? "#a5b4fc" : "#334155", fontSize: 12, cursor: "pointer", fontFamily: "monospace", letterSpacing: "1px", textTransform: "uppercase" }}>{tab}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", paddingBottom: 4 }}>
              <button onClick={copyContent} style={{ padding: "6px 14px", background: copied ? "rgba(16,185,129,0.1)" : "#0d1526", border: `1px solid ${copied ? "#10b981" : "#1a2540"}`, borderRadius: 7, color: copied ? "#10b981" : "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{copied ? "✓ Copied!" : "Copy"}</button>
            </div>
          </div>

          {activeTab === "content" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
              <Panel>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 7, lineHeight: 1.4, letterSpacing: "-0.5px" }}>{result.title}</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
                  <Tag color="#6366f1">{result.focusKeyword}</Tag>
                  <Tag color="#475569">⏱ {result.estimatedReadTime}</Tag>
                  <Tag color="#475569">📝 ~{result.wordCount} words</Tag>
                  <Tag color="#475569">📐 {result.schemaType}</Tag>
                </div>
                <div>{renderContent(result.content)}</div>
              </Panel>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Panel>
                  <SectionLabel>Overall Score</SectionLabel>
                  <div style={{ fontSize: 52, fontWeight: 700, color: scoreColor(result.seoScore.overall), lineHeight: 1, marginBottom: 4 }}>{result.seoScore.overall}</div>
                  <div style={{ fontSize: 11, color: "#334155" }}>out of 100</div>
                </Panel>
                <Panel>
                  <SectionLabel>LSI Keywords</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {result.lsiKeywords?.map((kw) => <Tag key={kw} color="#6366f1">{kw}</Tag>)}
                  </div>
                </Panel>
                <Panel>
                  <SectionLabel>Quick Wins</SectionLabel>
                  {result.optimizationTips?.map((tip, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#475569", marginBottom: 9, paddingLeft: 12, borderLeft: "2px solid #1a2540", lineHeight: 1.6 }}>💡 {tip}</div>
                  ))}
                </Panel>
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <Panel style={{ maxWidth: 680 }}>
              {[["H1 TITLE TAG", result.title, null], ["META DESCRIPTION", result.metaDescription, result.metaDescription?.length], ["FOCUS KEYWORD", result.focusKeyword, null], ["SCHEMA TYPE", result.schemaType, null], ["READ TIME", result.estimatedReadTime, null]].map(([label, value, chars]) => (
                <div key={label} style={{ borderBottom: "1px solid #0d1526", paddingBottom: 18, marginBottom: 18 }}>
                  <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", letterSpacing: "2px", marginBottom: 7 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#e2e8f0", background: "#020817", padding: "10px 14px", borderRadius: 7, fontFamily: label === "H1 TITLE TAG" ? "Georgia,serif" : "monospace" }}>{value}</div>
                  {chars && <div style={{ fontSize: 10, color: chars > 155 ? "#f87171" : "#10b981", marginTop: 5, fontFamily: "monospace" }}>{chars}/155 {chars > 155 ? "⚠ Too long" : "✓ Good"}</div>}
                </div>
              ))}
              <SectionLabel>LSI / Semantic Keywords</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{result.lsiKeywords?.map((kw) => <Tag key={kw} color="#6366f1">{kw}</Tag>)}</div>
            </Panel>
          )}

          {activeTab === "scores" && (
            <Panel style={{ maxWidth: 540 }}>
              <div style={{ display: "flex", gap: 20, marginBottom: 28, alignItems: "center" }}>
                <div style={{ fontSize: 60, fontWeight: 700, color: scoreColor(result.seoScore.overall), lineHeight: 1 }}>{result.seoScore.overall}</div>
                <div><div style={{ fontSize: 14, color: "#f1f5f9", fontWeight: 600 }}>Overall Score</div><div style={{ fontSize: 11, color: "#334155" }}>Composite optimization rating</div></div>
              </div>
              <ScoreBar label="Keyword Optimization" value={result.seoScore.keywordOptimization} />
              <ScoreBar label="Readability" value={result.seoScore.readability} />
              <ScoreBar label="Content Structure" value={result.seoScore.structure} />
              <ScoreBar label="GEO / AI Readiness" value={result.seoScore.geoReadiness} />
              <ScoreBar label="E-E-A-T Signals" value={result.seoScore.eeatSignals} />
              <div style={{ borderTop: "1px solid #1a2540", paddingTop: 20, marginTop: 22 }}>
                <SectionLabel>Optimization Tips</SectionLabel>
                {result.optimizationTips?.map((tip, i) => <div key={i} style={{ fontSize: 12, color: "#475569", marginBottom: 10, display: "flex", gap: 8, lineHeight: 1.6 }}><span style={{ color: "#6366f1" }}>→</span>{tip}</div>)}
              </div>
            </Panel>
          )}

          {activeTab === "faq" && (
            <Panel style={{ maxWidth: 680 }}>
              <SectionLabel>FAQ Section</SectionLabel>
              <div style={{ fontSize: 11, color: "#334155", marginBottom: 20 }}>Add as FAQPage schema for rich snippets + AI citations</div>
              {result.faqSection?.map((faq, i) => (
                <div key={i} style={{ borderBottom: "1px solid #0d1526", paddingBottom: 18, marginBottom: 18 }}>
                  <div style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 700, marginBottom: 7, display: "flex", gap: 9 }}><span style={{ color: "#6366f1", fontFamily: "monospace" }}>Q{i+1}</span>{faq.question}</div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, paddingLeft: 22 }}>{faq.answer}</div>
                </div>
              ))}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page: Keyword Gap ────────────────────────────────────────────────────────

function KeywordGapPage() {
  const [topic, setTopic] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setError(""); setLoading(true);
    try {
      const res = await callClaude(KEYWORD_GAP_PROMPT,
        `Topic: "${topic}"\nCompetitors context: "${competitors || "general industry competitors"}"\nFind keyword gaps, opportunities, quick wins, and long-tail gems.`);
      setResult(res);
    } catch (e) { setError(`Analysis failed: ${e.message || "Please try again."}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, color: "#f8fafc", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.5px" }}>Keyword Gap Analyzer</h2>
        <p style={{ fontSize: 13, color: "#475569" }}>Uncover untapped keyword opportunities your competitors are missing.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lbl}>YOUR TOPIC / NICHE *</label><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Project management software for remote teams" style={inp} /></div>
        <div><label style={lbl}>COMPETITOR CONTEXT (optional)</label><input value={competitors} onChange={(e) => setCompetitors(e.target.value)} placeholder="e.g. Asana, Monday.com, ClickUp" style={{ ...inp, fontFamily: "monospace" }} /></div>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "9px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
      <button onClick={analyze} disabled={loading} style={{ padding: "11px 28px", background: loading ? "#0d1526" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: loading ? "1px solid #1a2540" : "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
        {loading ? <><Spinner />Analyzing keyword gaps...</> : "🔍 Find Keyword Gaps"}
      </button>

      {result && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[["Total Opportunities", result.totalOpportunities, "#6366f1"], ["Quick Wins", result.quickWins?.length, "#10b981"], ["Long-tail Gems", result.longTailGems?.length, "#f59e0b"]].map(([label, val, color]) => (
              <Panel key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{label}</div>
              </Panel>
            ))}
          </div>

          {/* Keyword Clusters */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Keyword Clusters by Intent</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.keywordClusters?.map((cluster, ci) => (
                <Panel key={ci}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 14, color: "#f1f5f9", fontWeight: 700 }}>{cluster.theme}</span>
                    <Tag color={intentColor(cluster.intent)}>{cluster.intent}</Tag>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8 }}>
                    {cluster.keywords?.map((kw, ki) => (
                      <div key={ki} style={{ padding: "10px 14px", background: "#020817", borderRadius: 8, border: `1px solid ${kw.gap ? "rgba(99,102,241,0.3)" : "#1a2540"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, color: kw.gap ? "#a5b4fc" : "#64748b", fontFamily: "monospace" }}>{kw.keyword}</div>
                          <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{kw.searchVolume} · KD {kw.difficulty}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                          <Tag color={opportunityColor(kw.opportunity)}>{kw.opportunity}</Tag>
                          {kw.gap && <span style={{ fontSize: 9, color: "#6366f1", fontFamily: "monospace" }}>GAP ↑</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Panel>
              <SectionLabel>⚡ Quick Wins</SectionLabel>
              {result.quickWins?.map((kw, i) => <div key={i} style={{ fontSize: 12, color: "#10b981", fontFamily: "monospace", marginBottom: 7, padding: "6px 10px", background: "rgba(16,185,129,0.05)", borderRadius: 5, border: "1px solid rgba(16,185,129,0.15)" }}>{kw}</div>)}
            </Panel>
            <Panel>
              <SectionLabel>💎 Long-tail Gems</SectionLabel>
              {result.longTailGems?.map((kw, i) => <div key={i} style={{ fontSize: 12, color: "#f59e0b", fontFamily: "monospace", marginBottom: 7, padding: "6px 10px", background: "rgba(245,158,11,0.05)", borderRadius: 5, border: "1px solid rgba(245,158,11,0.15)" }}>{kw}</div>)}
            </Panel>
            <Panel>
              <SectionLabel>🕳️ Content Gaps</SectionLabel>
              {result.contentGaps?.map((gap, i) => <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 9, paddingLeft: 10, borderLeft: "2px solid #1a2540", lineHeight: 1.5 }}>{gap}</div>)}
              {result.competitorWeaknesses?.length > 0 && <>
                <SectionLabel style={{ marginTop: 14 }}>Competitor Weaknesses</SectionLabel>
                {result.competitorWeaknesses?.map((w, i) => <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 7, display: "flex", gap: 6 }}><span style={{ color: "#ef4444" }}>✗</span>{w}</div>)}
              </>}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page: Competitor Analysis ────────────────────────────────────────────────

function CompetitorPage() {
  const [topic, setTopic] = useState("");
  const [ownAngle, setOwnAngle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setError(""); setLoading(true);
    try {
      const res = await callClaude(COMPETITOR_PROMPT,
        `Topic: "${topic}"\nOur planned angle: "${ownAngle || "not specified"}"\nAnalyze the competitive landscape and identify winning angles.`);
      setResult(res);
    } catch (e) { setError(`Analysis failed: ${e.message || "Please try again."}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, color: "#f8fafc", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.5px" }}>Competitor Content Analysis</h2>
        <p style={{ fontSize: 13, color: "#475569" }}>Understand the competitive landscape and identify your winning differentiation angle.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lbl}>TOPIC / KEYWORD *</label><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Best CRM software for small business" style={inp} /></div>
        <div><label style={lbl}>YOUR PLANNED ANGLE (optional)</label><input value={ownAngle} onChange={(e) => setOwnAngle(e.target.value)} placeholder="e.g. Focus on budget-conscious startups" style={inp} /></div>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, padding: "9px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
      <button onClick={analyze} disabled={loading} style={{ padding: "11px 28px", background: loading ? "#0d1526" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: loading ? "1px solid #1a2540" : "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
        {loading ? <><Spinner />Analyzing competitors...</> : "⚖️ Analyze Competition"}
      </button>

      {result && (
        <div>
          {/* Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Panel style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor(result.overallCompetitiveScore), lineHeight: 1, marginBottom: 4 }}>{result.overallCompetitiveScore}</div>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>Competitive Score</div>
            </Panel>
            <Panel style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#6366f1", lineHeight: 1, marginBottom: 4 }}>{result.recommendedWordCount?.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>Recommended Words</div>
            </Panel>
            <Panel style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981", lineHeight: 1, marginBottom: 4 }}>{result.winningAngles?.length}</div>
              <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>Winning Angles Found</div>
            </Panel>
          </div>

          {/* Recommendation */}
          <Panel style={{ marginBottom: 20, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <SectionLabel>Strategic Recommendation</SectionLabel>
            <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, margin: 0 }}>{result.recommendation}</p>
          </Panel>

          {/* Competitor Profiles */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Competitor Profiles</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {result.competitorProfiles?.map((cp, i) => (
                <Panel key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>{cp.type}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>{cp.approach}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(cp.seoScore) }}>{cp.seoScore}</div><div style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>SEO</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(cp.geoScore) }}>{cp.geoScore}</div><div style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>GEO</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(cp.eeatScore) }}>{cp.eeatScore}</div><div style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>E-E-A-T</div></div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 7 }}>CONTENT GAPS</div>
                      {cp.contentGaps?.map((g, gi) => <div key={gi} style={{ fontSize: 11, color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#ef4444" }}>✗</span>{g}</div>)}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 7 }}>DIFFERENTIATORS</div>
                      {cp.differentiators?.map((d, di) => <div key={di} style={{ fontSize: 11, color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#10b981" }}>✓</span>{d}</div>)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 10, fontFamily: "monospace" }}>Word count range: {cp.wordCountRange}</div>
                </Panel>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <SectionLabel>🎯 Winning Angles</SectionLabel>
              {result.winningAngles?.map((a, i) => <div key={i} style={{ fontSize: 12, color: "#a5b4fc", marginBottom: 9, paddingLeft: 10, borderLeft: "2px solid #6366f1", lineHeight: 1.5 }}>{a}</div>)}
            </Panel>
            <Panel>
              <SectionLabel>⭐ Our Strengths vs Weaknesses</SectionLabel>
              {result.ourStrengths?.map((s, i) => <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#10b981" }}>✓</span>{s}</div>)}
              <div style={{ borderTop: "1px solid #1a2540", paddingTop: 12, marginTop: 12 }}>
                {result.ourWeaknesses?.map((w, i) => <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: "#f59e0b" }}>⚠</span>{w}</div>)}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page: CMS Export ─────────────────────────────────────────────────────────

function ExportPage({ result }) {
  const [exportFormat, setExportFormat] = useState("wordpress");
  const [authorName, setAuthorName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [copied, setCopied] = useState("");

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(""), 2000);
  };

  if (!result) return (
    <Panel style={{ textAlign: "center", padding: 48 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📤</div>
      <div style={{ fontSize: 15, color: "#f1f5f9", fontWeight: 700, marginBottom: 8 }}>No Content to Export</div>
      <div style={{ fontSize: 12, color: "#334155" }}>Generate content in the <strong style={{ color: "#818cf8" }}>Create</strong> tab first, then come back to export.</div>
    </Panel>
  );

  // WordPress XML export
  const wpXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <wp:wxr_version>1.2</wp:wxr_version>
    <item>
      <title>${result.title || ""}</title>
      <content:encoded><![CDATA[${result.content || ""}]]></content:encoded>
      <excerpt:encoded><![CDATA[${result.metaDescription || ""}]]></excerpt:encoded>
      <wp:post_type>post</wp:post_type>
      <wp:status>draft</wp:status>
      <wp:post_author>${authorName || "admin"}</wp:post_author>
      <category domain="category" nicename="${(category || "uncategorized").toLowerCase().replace(/ /g, "-")}">${category || "Uncategorized"}</category>
      ${(tags || result.lsiKeywords?.join(", ") || "").split(",").map((t) => `<category domain="post_tag" nicename="${t.trim().toLowerCase().replace(/ /g, "-")}">${t.trim()}</category>`).join("\n      ")}
    </item>
  </channel>
</rss>`;

  // Ghost JSON export
  const ghostJSON = JSON.stringify({
    db: [{
      meta: { exported_on: Date.now(), version: "5.0.0" },
      data: {
        posts: [{
          id: "1",
          title: result.title || "",
          slug: (result.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          mobiledoc: JSON.stringify({ version: "0.3.1", atoms: [], cards: [["markdown", { cardName: "markdown", markdown: result.content || "" }]], markups: [], sections: [[10, 0]] }),
          html: result.content || "",
          custom_excerpt: result.metaDescription || "",
          meta_title: result.title || "",
          meta_description: result.metaDescription || "",
          og_title: result.title || "",
          twitter_title: result.title || "",
          status: "draft",
          created_at: Date.now(),
          updated_at: Date.now(),
        }],
        tags: (tags || result.lsiKeywords?.slice(0,5).join(", ") || "").split(",").map((t, i) => ({ id: String(i+1), name: t.trim(), slug: t.trim().toLowerCase().replace(/ /g, "-") })),
      }
    }]
  }, null, 2);

  // Markdown with frontmatter
  const mdExport = `---
title: "${result.title || ""}"
description: "${result.metaDescription || ""}"
date: "${new Date().toISOString().split("T")[0]}"
author: "${authorName || "Author"}"
category: "${category || "Blog"}"
tags: [${(tags || result.lsiKeywords?.join(", ") || "").split(",").map((t) => `"${t.trim()}"`).join(", ")}]
focusKeyword: "${result.focusKeyword || ""}"
schema: "${result.schemaType || "Article"}"
readTime: "${result.estimatedReadTime || ""}"
${featuredImage ? `featuredImage: "${featuredImage}"` : ""}
---

${result.content || ""}`;

  // Schema.org JSON-LD
  const schemaJSON = JSON.stringify({
    "@context": "https://schema.org",
    "@type": result.schemaType === "HowTo" ? "HowTo" : result.schemaType === "FAQPage" ? "FAQPage" : "Article",
    "headline": result.title || "",
    "description": result.metaDescription || "",
    "author": { "@type": "Person", "name": authorName || "Author" },
    "datePublished": new Date().toISOString().split("T")[0],
    "keywords": result.lsiKeywords?.join(", ") || "",
    ...(result.faqSection?.length ? {
      "mainEntity": result.faqSection.map((f) => ({ "@type": "Question", "name": f.question, "acceptedAnswer": { "@type": "Answer", "text": f.answer } }))
    } : {})
  }, null, 2);

  const exports = {
    wordpress: { label: "WordPress XML", icon: "🔵", ext: "xml", content: wpXML },
    ghost: { label: "Ghost JSON", icon: "👻", ext: "json", content: ghostJSON },
    markdown: { label: "Markdown + Frontmatter", icon: "📄", ext: "md", content: mdExport },
    schema: { label: "Schema.org JSON-LD", icon: "🧩", ext: "json", content: schemaJSON },
  };

  const current = exports[exportFormat];

  const downloadFile = () => {
    const blob = new Blob([current.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(result.title || "content").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0,40)}.${current.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, color: "#f8fafc", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.5px" }}>CMS Export</h2>
        <p style={{ fontSize: 13, color: "#475569" }}>Export your content ready to publish on any CMS platform.</p>
      </div>

      {/* Format selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(exports).map(([key, val]) => (
          <button key={key} onClick={() => setExportFormat(key)} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${exportFormat === key ? "#6366f1" : "#1a2540"}`, background: exportFormat === key ? "rgba(99,102,241,0.12)" : "transparent", color: exportFormat === key ? "#a5b4fc" : "#475569", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace" }}>
            <span>{val.icon}</span>{val.label}
          </button>
        ))}
      </div>

      {/* Metadata */}
      <Panel style={{ marginBottom: 16 }}>
        <SectionLabel>Export Settings</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={lbl}>AUTHOR NAME</label><input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. Jane Smith" style={inp} /></div>
          <div><label style={lbl}>CATEGORY</label><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Marketing, SEO" style={inp} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={lbl}>TAGS (comma-separated)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={result.lsiKeywords?.slice(0,3).join(", ")} style={{ ...inp, fontFamily: "monospace" }} /></div>
          <div><label style={lbl}>FEATURED IMAGE URL</label><input value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="https://yourdomain.com/image.jpg" style={{ ...inp, fontFamily: "monospace" }} /></div>
        </div>
      </Panel>

      {/* Preview + Actions */}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{current.icon}</span>
            <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700 }}>{current.label}</span>
            <Tag color="#475569">.{current.ext}</Tag>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => copy(current.content, "main")} style={{ padding: "7px 14px", background: copied === "main" ? "rgba(16,185,129,0.1)" : "#0d1526", border: `1px solid ${copied === "main" ? "#10b981" : "#1a2540"}`, borderRadius: 7, color: copied === "main" ? "#10b981" : "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{copied === "main" ? "✓ Copied!" : "Copy"}</button>
            <button onClick={downloadFile} style={{ padding: "7px 14px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 7, color: "#a5b4fc", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>⬇ Download</button>
          </div>
        </div>
        <pre style={{ background: "#020817", border: "1px solid #0d1526", borderRadius: 8, padding: 16, fontSize: 11, color: "#475569", overflow: "auto", maxHeight: 380, fontFamily: "monospace", lineHeight: 1.6, margin: 0 }}>{current.content}</pre>
      </Panel>

      {/* Schema separately */}
      {exportFormat !== "schema" && (
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🧩</span>
              <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700 }}>Schema.org JSON-LD</span>
              <Tag color="#10b981">Bonus</Tag>
            </div>
            <button onClick={() => copy(schemaJSON, "schema")} style={{ padding: "7px 14px", background: copied === "schema" ? "rgba(16,185,129,0.1)" : "#0d1526", border: `1px solid ${copied === "schema" ? "#10b981" : "#1a2540"}`, borderRadius: 7, color: copied === "schema" ? "#10b981" : "#64748b", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{copied === "schema" ? "✓ Copied!" : "Copy for <head>"}</button>
          </div>
          <pre style={{ background: "#020817", border: "1px solid #0d1526", borderRadius: 8, padding: 16, fontSize: 11, color: "#475569", overflow: "auto", maxHeight: 220, fontFamily: "monospace", lineHeight: 1.6, margin: 0 }}>{schemaJSON}</pre>
        </Panel>
      )}
    </div>
  );
}

// ─── Page: Brand Voice ────────────────────────────────────────────────────────

function BrandVoicePage({ brandVoice, setBrandVoice }) {
  const [local, setLocal] = useState(brandVoice);
  const [newDo, setNewDo] = useState("");
  const [newDont, setNewDont] = useState("");
  const [newForbidden, setNewForbidden] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [saved, setSaved] = useState(brandVoice.saved);
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState("");

  const handleCrawl = async () => {
    if (!local.websiteUrl.trim()) return;
    setCrawling(true);
    setCrawlError("");
    try {
      const data = await crawlWebsite(local.websiteUrl);
      setLocal((p) => ({ ...p, crawlData: data }));
    } catch (e) {
      setCrawlError("Could not crawl the website. Please check the URL and try again, or fill in details manually.");
    } finally {
      setCrawling(false);
    }
  };

  const autoFill = () => {
    if (!local.crawlData) return;
    setLocal((p) => ({
      ...p,
      companyName: p.crawlData.companyName || p.companyName,
      industry: p.crawlData.industry || p.industry,
      tagline: p.crawlData.tagline || p.tagline,
      brandMission: p.crawlData.brandMission || p.brandMission,
    }));
  };

  const update = (key, val) => setLocal((p) => ({ ...p, [key]: val }));
  const updateTrait = (key, val) => setLocal((p) => ({ ...p, traits: { ...p.traits, [key]: val } }));

  const addItem = (key, val, reset) => {
    if (!val.trim()) return;
    setLocal((p) => ({ ...p, [key]: [...p[key], val.trim()] }));
    reset("");
  };
  const removeItem = (key, idx) => setLocal((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const save = () => {
    setBrandVoice({ ...local, saved: true });
    setSaved(true);
  };

  const clear = () => {
    const reset = { ...DEFAULT_BRAND_VOICE };
    setLocal(reset);
    setBrandVoice(reset);
    setSaved(false);
    setCrawlError("");
  };

  const activeArchetype = VOICE_ARCHETYPES.find((a) => a.id === local.archetype);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, color: "#f8fafc", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.5px" }}>Brand Voice</h2>
        <p style={{ fontSize: 13, color: "#475569" }}>Define your company's voice and personality. Once saved, every piece of content will sound unmistakably like <em style={{ color: "#818cf8" }}>you</em>.</p>
      </div>

      {saved && (
        <div style={{ marginBottom: 20, padding: "12px 18px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
          <span style={{ fontSize: 13, color: "#10b981" }}>Brand voice active — all content will reflect <strong>{local.companyName || "your brand"}</strong>'s guidelines</span>
          <button onClick={clear} style={{ marginLeft: "auto", fontSize: 11, color: "#334155", fontFamily: "monospace", background: "transparent", border: "1px solid #1a2540", borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>Clear</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Website Crawl */}
          <Panel style={{ border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.03)" }}>
            <SectionLabel>🌐 Website Intelligence</SectionLabel>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 14, lineHeight: 1.6 }}>
              Enter your website URL and we'll crawl it to automatically detect your brand's products, messaging, tone, and content opportunities.
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: local.crawlData ? 16 : 0 }}>
              <input
                value={local.websiteUrl}
                onChange={(e) => update("websiteUrl", e.target.value)}
                placeholder="https://yourwebsite.com"
                style={{ ...inp, fontFamily: "monospace", flex: 1 }}
                onKeyDown={(e) => e.key === "Enter" && !crawling && local.websiteUrl && handleCrawl()}
              />
              <button
                onClick={handleCrawl}
                disabled={crawling || !local.websiteUrl.trim()}
                style={{ padding: "10px 18px", background: crawling ? "#0d1526" : "linear-gradient(135deg,#4f46e5,#7c3aed)", border: crawling ? "1px solid #1a2540" : "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: crawling || !local.websiteUrl.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8, opacity: !local.websiteUrl.trim() ? 0.4 : 1 }}
              >
                {crawling ? <><Spinner />Crawling...</> : "🔍 Crawl Site"}
              </button>
            </div>
            {crawlError && <div style={{ fontSize: 12, color: "#f87171", marginTop: 10, padding: "8px 12px", background: "rgba(239,68,68,0.07)", borderRadius: 7, border: "1px solid rgba(239,68,68,0.15)" }}>{crawlError}</div>}

            {local.crawlData && (
              <div style={{ marginTop: 16, borderTop: "1px solid rgba(99,102,241,0.15)", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ color: "#10b981", fontSize: 15 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#10b981", fontWeight: 700 }}>Site crawled — brand intelligence extracted</span>
                  <button onClick={() => update("crawlData", null)} style={{ marginLeft: "auto", fontSize: 10, color: "#334155", background: "transparent", border: "1px solid #1a2540", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontFamily: "monospace" }}>Clear</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {local.crawlData.productsServices?.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#020817", borderRadius: 8, border: "1px solid #1a2540" }}>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 7, letterSpacing: "1.5px" }}>PRODUCTS / SERVICES</div>
                      {local.crawlData.productsServices.map((p, i) => <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 4, display: "flex", gap: 6 }}><span style={{ color: "#6366f1" }}>·</span>{p}</div>)}
                    </div>
                  )}
                  {local.crawlData.keyMessages?.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#020817", borderRadius: 8, border: "1px solid #1a2540" }}>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 7, letterSpacing: "1.5px" }}>KEY MESSAGES</div>
                      {local.crawlData.keyMessages.map((m, i) => <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 4, display: "flex", gap: 6 }}><span style={{ color: "#a78bfa" }}>·</span>{m}</div>)}
                    </div>
                  )}
                  {local.crawlData.uniqueValueProps?.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#020817", borderRadius: 8, border: "1px solid #1a2540" }}>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 7, letterSpacing: "1.5px" }}>VALUE PROPOSITIONS</div>
                      {local.crawlData.uniqueValueProps.map((v, i) => <div key={i} style={{ fontSize: 11, color: "#64748b", marginBottom: 4, display: "flex", gap: 6 }}><span style={{ color: "#10b981" }}>·</span>{v}</div>)}
                    </div>
                  )}
                  {local.crawlData.contentOpportunities?.length > 0 && (
                    <div style={{ padding: "10px 14px", background: "#020817", borderRadius: 8, border: "1px solid #1a2540" }}>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 7, letterSpacing: "1.5px" }}>CONTENT OPPORTUNITIES</div>
                      {local.crawlData.contentOpportunities.map((c, i) => <div key={i} style={{ fontSize: 11, color: "#f59e0b", marginBottom: 4, display: "flex", gap: 6 }}><span>💡</span>{c}</div>)}
                    </div>
                  )}
                </div>
                {local.crawlData.toneObservations && (
                  <div style={{ marginTop: 10, padding: "10px 14px", background: "#020817", borderRadius: 8, border: "1px solid #1a2540" }}>
                    <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 6, letterSpacing: "1.5px" }}>DETECTED TONE</div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, fontStyle: "italic" }}>"{local.crawlData.toneObservations}"</div>
                  </div>
                )}
                {local.crawlData.brandKeywords?.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {local.crawlData.brandKeywords.map((kw) => <Tag key={kw} color="#6366f1">{kw}</Tag>)}
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Identity */}
          <Panel>
            <SectionLabel>Company Identity</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label style={lbl}>COMPANY NAME</label><input value={local.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder={local.crawlData?.companyName || "e.g. Acme Corp"} style={inp} /></div>
              <div><label style={lbl}>INDUSTRY</label><input value={local.industry} onChange={(e) => update("industry", e.target.value)} placeholder={local.crawlData?.industry || "e.g. B2B SaaS, Healthcare"} style={inp} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>BRAND TAGLINE / POSITIONING</label>
              <input value={local.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder={local.crawlData?.tagline || "e.g. The all-in-one platform for modern teams"} style={inp} />
            </div>
            <div>
              <label style={lbl}>BRAND MISSION (optional)</label>
              <input value={local.brandMission} onChange={(e) => update("brandMission", e.target.value)} placeholder={local.crawlData?.brandMission || "e.g. Helping SMBs compete like enterprises"} style={inp} />
            </div>
            {local.crawlData && (
              <button onClick={autoFill} style={{ marginTop: 12, padding: "7px 14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 7, color: "#a5b4fc", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
                ✦ Auto-fill from crawl data
              </button>
            )}
          </Panel>

          {/* Archetype */}
          <Panel>
            <SectionLabel>Voice Archetype</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {VOICE_ARCHETYPES.map((a) => (
                <button key={a.id} onClick={() => update("archetype", a.id)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 9, border: `1px solid ${local.archetype === a.id ? "#6366f1" : "#1a2540"}`, background: local.archetype === a.id ? "rgba(99,102,241,0.1)" : "transparent", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{a.icon}</div>
                  <div style={{ fontSize: 12, color: local.archetype === a.id ? "#a5b4fc" : "#64748b", fontWeight: 700, marginBottom: 3 }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: "#334155", lineHeight: 1.4 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </Panel>

          {/* Personality Sliders */}
          <Panel>
            <SectionLabel>Personality Spectrum</SectionLabel>
            {PERSONALITY_TRAITS.map((trait) => (
              <div key={trait.id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: local.traits[trait.id] < 40 ? "#a5b4fc" : "#334155", fontFamily: "monospace", transition: "color 0.2s" }}>{trait.left}</span>
                  <span style={{ fontSize: 11, color: local.traits[trait.id] > 60 ? "#a5b4fc" : "#334155", fontFamily: "monospace", transition: "color 0.2s" }}>{trait.right}</span>
                </div>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#1a2540", transform: "translateY(-50%)", borderRadius: 2 }} />
                  <div style={{ position: "absolute", top: "50%", left: 0, width: `${local.traits[trait.id]}%`, height: 2, background: "linear-gradient(90deg,#4f46e5,#7c3aed)", transform: "translateY(-50%)", borderRadius: 2, transition: "width 0.1s" }} />
                  <input type="range" min={0} max={100} value={local.traits[trait.id]} onChange={(e) => updateTrait(trait.id, +e.target.value)}
                    style={{ position: "relative", width: "100%", accentColor: "#6366f1", cursor: "pointer", background: "transparent" }} />
                </div>
              </div>
            ))}
          </Panel>

          {/* Dos & Don'ts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <SectionLabel>✅ Always Do</SectionLabel>
              {local.dos.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: "#10b981", flex: 1, lineHeight: 1.5 }}>{item}</span>
                  <button onClick={() => removeItem("dos", i)} style={{ color: "#334155", background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <input value={newDo} onChange={(e) => setNewDo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem("dos", newDo, setNewDo)} placeholder="Add a rule..." style={{ ...inp, fontSize: 12, padding: "7px 10px", flex: 1 }} />
                <button onClick={() => addItem("dos", newDo, setNewDo)} style={{ padding: "7px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 7, color: "#10b981", cursor: "pointer", fontSize: 13 }}>+</button>
              </div>
            </Panel>
            <Panel>
              <SectionLabel>❌ Never Do</SectionLabel>
              {local.donts.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: "#ef4444", flex: 1, lineHeight: 1.5 }}>{item}</span>
                  <button onClick={() => removeItem("donts", i)} style={{ color: "#334155", background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <input value={newDont} onChange={(e) => setNewDont(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem("donts", newDont, setNewDont)} placeholder="Add a rule..." style={{ ...inp, fontSize: 12, padding: "7px 10px", flex: 1 }} />
                <button onClick={() => addItem("donts", newDont, setNewDont)} style={{ padding: "7px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 13 }}>+</button>
              </div>
            </Panel>
          </div>

          {/* Forbidden words + signature phrases */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <SectionLabel>🚫 Forbidden Words</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {local.forbiddenWords.map((w, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "3px 9px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, color: "#f87171", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                    {w}<button onClick={() => removeItem("forbiddenWords", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newForbidden} onChange={(e) => setNewForbidden(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem("forbiddenWords", newForbidden, setNewForbidden)} placeholder="Word to avoid..." style={{ ...inp, fontSize: 12, padding: "7px 10px", flex: 1, fontFamily: "monospace" }} />
                <button onClick={() => addItem("forbiddenWords", newForbidden, setNewForbidden)} style={{ padding: "7px 12px", background: "#0d1526", border: "1px solid #1a2540", borderRadius: 7, color: "#64748b", cursor: "pointer", fontSize: 13 }}>+</button>
              </div>
            </Panel>
            <Panel>
              <SectionLabel>💬 Signature Phrases</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {local.signaturePhrases.map((w, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "3px 9px", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 4, color: "#818cf8", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                    {w}<button onClick={() => removeItem("signaturePhrases", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newPhrase} onChange={(e) => setNewPhrase(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem("signaturePhrases", newPhrase, setNewPhrase)} placeholder="e.g. the smarter way to..." style={{ ...inp, fontSize: 12, padding: "7px 10px", flex: 1 }} />
                <button onClick={() => addItem("signaturePhrases", newPhrase, setNewPhrase)} style={{ padding: "7px 12px", background: "#0d1526", border: "1px solid #1a2540", borderRadius: 7, color: "#64748b", cursor: "pointer", fontSize: 13 }}>+</button>
              </div>
            </Panel>
          </div>

          {/* Target emotion */}
          <Panel>
            <SectionLabel>Target Reader Emotion</SectionLabel>
            <p style={{ fontSize: 12, color: "#334155", marginBottom: 10 }}>How should the reader feel after consuming your content?</p>
            <input value={local.targetEmotion} onChange={(e) => update("targetEmotion", e.target.value)} placeholder="e.g. Informed and empowered, Excited to take action, Confident in their decision" style={inp} />
          </Panel>

          <button onClick={save} style={{ padding: "13px 28px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.2px" }}>
            ✦ Save Brand Voice — Apply to All Content
          </button>
        </div>

        {/* Preview card */}
        <div style={{ position: "sticky", top: 80 }}>
          <Panel style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <SectionLabel>Voice Preview</SectionLabel>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{activeArchetype?.icon}</div>
            <div style={{ fontSize: 15, color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}>{local.companyName || "Your Brand"}</div>
            {local.tagline && <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", marginBottom: 12 }}>"{local.tagline}"</div>}
            <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, marginBottom: 2, fontFamily: "monospace" }}>{activeArchetype?.label}</div>
            <div style={{ fontSize: 11, color: "#334155", marginBottom: 16, lineHeight: 1.5 }}>{activeArchetype?.desc}</div>
            <div style={{ borderTop: "1px solid #1a2540", paddingTop: 14, marginTop: 4 }}>
              <SectionLabel>Personality Mix</SectionLabel>
              {PERSONALITY_TRAITS.map((t) => {
                const v = local.traits[t.id];
                const label = v < 30 ? t.left : v > 70 ? t.right : "Balanced";
                const color = v < 30 ? "#a5b4fc" : v > 70 ? "#818cf8" : "#475569";
                return (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>{t.left} / {t.right}</span>
                    <span style={{ fontSize: 10, color, fontFamily: "monospace", fontWeight: 700 }}>{label}</span>
                  </div>
                );
              })}
            </div>
            {local.forbiddenWords.length > 0 && (
              <div style={{ borderTop: "1px solid #1a2540", paddingTop: 14, marginTop: 4 }}>
                <SectionLabel>Banned Words</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {local.forbiddenWords.map((w) => <Tag key={w} color="#ef4444">{w}</Tag>)}
                </div>
              </div>
            )}
            {local.crawlData && (
              <div style={{ marginTop: 12, fontSize: 11, color: "#6366f1", fontFamily: "monospace", padding: "8px 12px", background: "rgba(99,102,241,0.06)", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)" }}>
                🌐 Website crawled<br />
                <span style={{ color: "#334155" }}>{local.websiteUrl}</span>
              </div>
            )}
            {!local.saved && (
              <div style={{ marginTop: 16, fontSize: 11, color: "#334155", fontFamily: "monospace", padding: "8px 12px", background: "#020817", borderRadius: 6, border: "1px solid #1a2540" }}>
                ⚠ Not saved yet — hit Save to activate
              </div>
            )}
            {local.saved && (
              <div style={{ marginTop: 16, fontSize: 11, color: "#10b981", fontFamily: "monospace", padding: "8px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)" }}>
                ✓ Active on all content generation
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const lbl = { fontSize: 10, color: "#334155", display: "block", marginBottom: 7, fontFamily: "monospace", letterSpacing: "2px", textTransform: "uppercase" };
const inp = { width: "100%", background: "#020817", border: "1px solid #1a2540", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Georgia,serif" };
const sel = { width: "100%", background: "#020817", border: "1px solid #1a2540", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 12, outline: "none", fontFamily: "monospace" };

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function ContentForge() {
  const [page, setPage] = useState("brand_voice");
  const [result, setResult] = useState(null);
  const [brandVoice, setBrandVoice] = useState(DEFAULT_BRAND_VOICE);

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "Georgia, serif" }}>
      {/* Top Nav */}
      <div style={{ borderBottom: "1px solid #0d1526", padding: "0 28px", background: "rgba(2,8,23,0.97)", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 28, borderRight: "1px solid #0d1526", marginRight: 8, padding: "14px 28px 14px 0" }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✦</div>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.3px" }}>ContentForge</div>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "monospace" }}>v3.0</div>
          </div>
        </div>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{ padding: "18px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${page === item.id ? "#6366f1" : "transparent"}`, color: page === item.id ? "#a5b4fc" : "#334155", fontSize: 12, cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s" }}>
            <span style={{ fontSize: 13 }}>{item.icon}</span>{item.label}
            {item.id === "brand_voice" && brandVoice.saved && <span style={{ fontSize: 9, padding: "2px 5px", background: "rgba(16,185,129,0.15)", borderRadius: 3, color: "#10b981" }}>ON</span>}
            {item.id === "export" && result && <span style={{ fontSize: 9, padding: "2px 5px", background: "rgba(99,102,241,0.2)", borderRadius: 3, color: "#818cf8" }}>READY</span>}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, padding: "0 0 0 16px" }}>
          {["SEO","GEO","GAO","E-E-A-T"].map((t) => <span key={t} style={{ fontSize: 9, padding: "3px 7px", border: "1px solid #0d1526", borderRadius: 3, color: "#1e293b", fontFamily: "monospace", letterSpacing: "1px" }}>{t}</span>)}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "36px 24px" }}>
        {page === "brand_voice" && <BrandVoicePage brandVoice={brandVoice} setBrandVoice={setBrandVoice} />}
        {page === "create" && (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, letterSpacing: "3px", textTransform: "uppercase", color: "#4f46e5", fontFamily: "monospace", marginBottom: 12 }}>AI Content Intelligence</div>
              <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-1.2px", color: "#f8fafc", margin: 0 }}>
                Create Content That Ranks<br />
                <span style={{ background: "linear-gradient(90deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Everywhere That Matters</span>
              </h1>
              {brandVoice.saved && (
                <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8 }}>
                  <span style={{ fontSize: 13 }}>🎨</span>
                  <span style={{ fontSize: 12, color: "#10b981" }}>Writing as <strong>{brandVoice.companyName || "your brand"}</strong> · {VOICE_ARCHETYPES.find(a => a.id === brandVoice.archetype)?.label}{brandVoice.crawlData ? " · 🌐 Site crawled" : ""}</span>
                  <button onClick={() => setPage("brand_voice")} style={{ fontSize: 10, color: "#334155", background: "transparent", border: "none", cursor: "pointer", fontFamily: "monospace", textDecoration: "underline" }}>edit</button>
                </div>
              )}
            </div>
            <CreatePage onResult={setResult} result={result} brandVoice={brandVoice} />
          </>
        )}
        {page === "keyword_gap" && <KeywordGapPage />}
        {page === "competitor" && <CompetitorPage />}
        {page === "export" && <ExportPage result={result} />}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #4f46e5 !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.12); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #020817; }
        ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 3px; }
      `}</style>
    </div>
  );
}