export type ProfanityHit = {
  isProfane: boolean;
  hits: string[];
};

// Keep this list "broad" but not exhaustive.
// IMPORTANT: we ONLY flag whole-word matches (to avoid false positives like "dictionary" -> "dick").
// We still detect spaced-out profanity like "f u c k".
const PROFANE_WORDS: string[] = [
  // English
  "fuck",
  "fuk",
  "fuq",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "dickhead",
  "cock",
  "cunt",
  "piss",
  "slut",
  "whore",
  "wtf",
  "stfu",
  "motherfucker",
  "bullshit",
  "crap",
  "damn",
  "fucking",
  "shitty",

  // Local-ish romanized (minimal)
  "otha",
  "punda",
  "loosu",
  "poda",
];

const SPACED_OUT_DETECT: string[] = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "stfu",
  "motherfucker",
];

function normalizeForMatch(input: string): string {
  const lower = input.toLowerCase();
  // basic leetspeak
  const leet = lower
    .replaceAll("0", "o")
    .replaceAll("1", "i")
    .replaceAll("3", "e")
    .replaceAll("4", "a")
    .replaceAll("5", "s")
    .replaceAll("7", "t")
    .replaceAll("@", "a")
    .replaceAll("$", "s");

  // remove separators/punctuations; keep letters/numbers/spaces
  return leet.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function spacedOutRegex(word: string): RegExp {
  // word boundary-ish matching on normalized text (spaces only)
  // e.g. "f u c k" or "f  u  c k"
  const letters = word.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const body = letters.join("\\s*");
  return new RegExp(`(?:^|\\s)${body}(?:\\s|$)`, "i");
}

export function checkProfanity(input: string): ProfanityHit {
  const norm = normalizeForMatch(input);
  const tokens = norm.split(" ").filter(Boolean);

  const hits = new Set<string>();

  // Whole-word matches only
  for (const w of PROFANE_WORDS) {
    if (tokens.includes(w)) hits.add(w);
  }

  // Spaced-out detection for a few high-signal words (still not substring matching)
  for (const w of SPACED_OUT_DETECT) {
    if (hits.has(w)) continue;
    const rx = spacedOutRegex(w);
    if (rx.test(norm)) hits.add(w);
  }

  return { isProfane: hits.size > 0, hits: Array.from(hits) };
}

