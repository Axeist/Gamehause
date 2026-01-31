import { KNOWLEDGE_BASE, QUICK_TILES } from "@/components/chat/gameboyKnowledge";
import { checkProfanity } from "@/components/chat/profanity";

export type BotReply = {
  text: string;
  kind: "answer" | "fallback" | "profanity" | "greeting";
  suggestedTiles?: typeof QUICK_TILES;
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function trigrams(s: string): Set<string> {
  const n = normalize(s).replace(/\s+/g, " ");
  const out = new Set<string>();
  if (n.length < 3) return out;
  for (let i = 0; i < n.length - 2; i++) out.add(n.slice(i, i + 3));
  return out;
}

function trigramJaccard(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function scoreArticle(query: string, article: (typeof KNOWLEDGE_BASE)[number]): number {
  const qTokens = tokenize(query);

  const keywordHits = article.keywords.reduce((acc, kw) => {
    const kwNorm = normalize(kw);
    if (!kwNorm) return acc;
    return normalize(query).includes(kwNorm) ? acc + 1 : acc;
  }, 0);

  const keywordScore = Math.min(1, keywordHits / Math.max(3, article.keywords.length / 4));

  let bestPatternScore = 0;
  for (const p of article.patterns) {
    const tokenScore = jaccard(qTokens, tokenize(p));
    const triScore = trigramJaccard(query, p);
    bestPatternScore = Math.max(bestPatternScore, 0.65 * tokenScore + 0.35 * triScore);
  }

  return 0.75 * bestPatternScore + 0.25 * keywordScore;
}

function pickQuirkyPreface(): string {
  const variants = [
    "Gameboy here.",
    "Yo — Gameboy reporting in.",
    "Gameboy online. Brain warmed up.",
    "Alright boss, Gameboy got you.",
  ];
  return variants[Math.floor(Math.random() * variants.length)]!;
}

export function getGameboyReply(inputRaw: string, opts?: { firstMessage?: boolean }): BotReply {
  const input = inputRaw.trim();
  if (!input) {
    return {
      kind: "fallback",
      text: "Drop me a question — booking, pricing, availability, location, or tournaments. I’ll be fast.",
      suggestedTiles: QUICK_TILES,
    };
  }

  if (opts?.firstMessage) {
    return {
      kind: "greeting",
      text: [
        `${pickQuirkyPreface()} I can help with anything Gamehaus.`,
        "",
        "Try one of these to start, or type your own question:",
      ].join("\n"),
      suggestedTiles: QUICK_TILES,
    };
  }

  const prof = checkProfanity(input);
  if (prof.isProfane) {
    return {
      kind: "profanity",
      text: [
        "Gameboy’s **Cyber Safety Reminder** (PG mode engaged):",
        "",
        "- Let’s keep it respectful — abusive language shuts down helpful mode.",
        "- If you’re dealing with actual online harassment/scams, India’s cybercrime helpline is **1930** and `cybercrime.gov.in`.",
        "",
        "This chat is just a website assistant (not a legal notice, not police). Now… want to ask about booking or availability?",
      ].join("\n"),
      suggestedTiles: QUICK_TILES,
    };
  }

  // Basic “small talk” handling
  const n = normalize(input);
  if (["hi", "hello", "hey", "yo", "sup"].includes(n)) {
    return {
      kind: "greeting",
      text: [
        `${pickQuirkyPreface()} Want to book a slot, check availability, or get pricing?`,
      ].join("\n"),
      suggestedTiles: QUICK_TILES,
    };
  }

  // Knowledge retrieval
  let best = { score: 0, article: KNOWLEDGE_BASE[0]! };
  for (const article of KNOWLEDGE_BASE) {
    const s = scoreArticle(input, article);
    if (s > best.score) best = { score: s, article };
  }

  // Threshold tuned for short/long questions
  const threshold = input.length <= 18 ? 0.22 : 0.18;

  if (best.score >= threshold) {
    return {
      kind: "answer",
      text: `${pickQuirkyPreface()}\n\n${best.article.answer()}`,
      suggestedTiles: QUICK_TILES,
    };
  }

  return {
    kind: "fallback",
    text: [
      `${pickQuirkyPreface()} I *think* I get what you mean, but I don’t want to guess wrong.`,
      "",
      "I’m best at:",
      "- Booking & slots",
      "- Live station availability",
      "- Pricing/rates (where to see the correct number)",
      "- Location & contact",
      "- Refund/cancellation policy",
      "",
      "Pick one below or rephrase your question in 6–10 words and I’ll nail it.",
    ].join("\n"),
    suggestedTiles: QUICK_TILES,
  };
}

