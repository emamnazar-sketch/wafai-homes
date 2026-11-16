// Wafai Homes website chatbot — Cloudflare Pages Function backed by Workers AI.
// Requires the Workers AI binding named "AI" on the Pages project.
// If the binding is missing or the model call fails, returns 503 so the
// widget falls back to lead capture (name/phone -> FormSubmit email).

const SYSTEM_PROMPT = [
  "You are the friendly website assistant for Wafai Homes — Mohammad Wafai, Realtor with eXp Realty (CA DRE# 02203253), serving Sacramento, Roseville, and 12 cities across the Sacramento area.",
  "Facts you may use: 100+ homes sold; 40+ five-star reviews; 5+ years of experience; credentials include CREN, CRS, ABR, PCAR Masters Club 2023-2025, and eXp ICON Agent (January 2025). Phone: (530) 301-6691. Email: wafaihomes@gmail.com. Office: 3550 Watt Ave #418, Sacramento, CA 95821.",
  "The site offers, through the forms on this page: a free Buyer's Guide booklet, a free Seller's Guide booklet, a free home evaluation with a 24-hour analysis, and free consultation booking.",
  "Rules: Answer briefly, 2-4 short sentences, warm and plain-spoken. Only use the facts above about Mohammad and his services. Never invent listings, prices, statistics, or guarantees. For specific listings, prices, or legal/tax questions, say Mohammad can help directly and give the phone number. If the visitor wants to buy, sell, get a home evaluation, or talk to Mohammad, encourage them to call (530) 301-6691 or use the forms on this page."
].join("\n");

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.AI) {
    return Response.json({ error: "ai_unavailable" }, { status: 503 });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const incoming = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of incoming) {
    if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()) {
      messages.push({ role: m.role, content: m.content.slice(0, 1000) });
    }
  }
  if (messages.length < 2) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: messages,
      max_tokens: 350
    });
    const reply = ((result && result.response) || "").trim();
    if (!reply) throw new Error("empty reply");
    return Response.json({ reply: reply });
  } catch (e) {
    return Response.json({ error: "ai_unavailable" }, { status: 503 });
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return onRequestPost(context);
}
