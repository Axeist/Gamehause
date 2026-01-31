export type ProfanityHit = {
  isProfane: boolean;
  hits: string[];
};

// Keep this list "broad" but not exhaustive. You can add/remove terms anytime.
// We normalize user text (lowercase, strip separators, basic leetspeak) before matching.
const PROFANITY_STEMS: string[] = [
  // English (common)
  "fuck",
  "fuk",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "a-hole",
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
  "mf",
  "bullshit",
  "crap",
  "damn",
  "fucking",
  "shitty",

  // Common internet variants / obfuscations
  "f*ck",
  "f**k",
  "sh*t",
  "bi*ch",
  "a**",
  "fuq",

  // Local-ish romanized (kept minimal)
  "otha",
  "punda",
  "loosu",
  "poda",
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

function stemNormalize(stem: string): string {
  return normalizeForMatch(stem).replace(/\s+/g, "");
}

export function checkProfanity(input: string): ProfanityHit {
  const norm = normalizeForMatch(input);
  const compact = norm.replace(/\s+/g, "");

  const hits = new Set<string>();

  for (const rawStem of PROFANITY_STEMS) {
    const stem = stemNormalize(rawStem);
    if (!stem) continue;

    // Match on compact string to catch spaced-out profanity: "f u c k"
    if (compact.includes(stem)) hits.add(rawStem);
  }

  return { isProfane: hits.size > 0, hits: Array.from(hits) };
}

