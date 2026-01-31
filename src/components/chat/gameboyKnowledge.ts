import { BRAND_NAME, PUBLIC_BOOKING_URL, SUPPORT_EMAIL, url } from "@/config/brand";

export type KnowledgeArticle = {
  id: string;
  title: string;
  // Example questions the user might ask
  patterns: string[];
  // Keywords to bias matching (tokens)
  keywords: string[];
  answer: () => string;
};

export const GAMEHAUS_ADDRESS =
  "40, S W Boag Rd, CIT Nagar West, T. Nagar, Chennai, Tamil Nadu 600035";

export const GAMEHAUS_PHONE = "+91 93451 87098";

export const QUICK_TILES: Array<{ id: string; label: string; prompt: string }> = [
  { id: "book", label: "Book a slot", prompt: "How do I book a slot?" },
  { id: "walkin", label: "Walk-ins?", prompt: "Can I walk in without booking?" },
  { id: "pricing", label: "Pricing", prompt: "What are your rates / pricing?" },
  { id: "availability", label: "Live availability", prompt: "Show me live availability" },
  { id: "location", label: "Location", prompt: "Where are you located?" },
  { id: "refunds", label: "Cancellations", prompt: "What is your cancellation / refund policy?" },
  { id: "tournaments", label: "Tournaments", prompt: "Do you host tournaments?" },
  { id: "contact", label: "Contact", prompt: "How can I contact you?" },
];

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: "who",
    title: "About Gamehaus",
    patterns: ["what is gamehaus", "tell me about gamehaus", "who are you", "what do you do"],
    keywords: ["about", "gamehaus", "snooker", "gaming", "lounge", "venue"],
    answer: () =>
      [
        `I’m Gameboy — the slightly over-caffeinated helper bot for **${BRAND_NAME}**.`,
        "",
        `We’re a premium snooker & gaming lounge in Chennai (T. Nagar) with:`,
        "- Tournament‑grade tables (snooker / pool)",
        "- PS5 stations for console sessions",
        "- Foosball and competitive community nights",
        "",
        "Ask me anything about booking, live availability, pricing, or policies.",
      ].join("\n"),
  },
  {
    id: "book",
    title: "How to book",
    patterns: ["how to book", "book a slot", "reserve", "booking link", "i want to book"],
    keywords: ["book", "booking", "reserve", "slot", "reservation"],
    answer: () =>
      [
        "Booking is quick:",
        `- Open: ${PUBLIC_BOOKING_URL}`,
        "- Pick your date + time",
        "- Choose the station type (snooker/pool/PS5/foosball)",
        "- Pay/confirm as prompted",
        "",
        "Pro tip: For peak hours/weekends, booking is the safest way to lock your preferred slot.",
      ].join("\n"),
  },
  {
    id: "walkin",
    title: "Walk-ins",
    patterns: ["walk in", "walk-in", "can i come now", "do you allow walkins", "without booking"],
    keywords: ["walk", "walkin", "walk-in", "without", "booking", "available"],
    answer: () =>
      [
        "Yes — walk-ins are welcome **when stations are available**.",
        "",
        "If you want to check before coming:",
        `- Live availability: ${url("/public/stations")}`,
        "",
        "For busy evenings/weekends, booking is recommended.",
      ].join("\n"),
  },
  {
    id: "availability",
    title: "Live availability",
    patterns: ["availability", "is anything free", "is ps5 available", "live status", "free stations"],
    keywords: ["live", "availability", "available", "occupied", "status", "stations", "ps5", "pool", "snooker", "foosball"],
    answer: () =>
      [
        "You can see live station status here:",
        `- ${url("/public/stations")}`,
        "",
        "On the homepage, the Live Station section is grouped by category and updates frequently.",
      ].join("\n"),
  },
  {
    id: "pricing",
    title: "Pricing / rates",
    patterns: ["pricing", "rate", "rates", "how much", "cost", "price", "hourly rate"],
    keywords: ["price", "pricing", "rate", "rates", "hour", "hourly", "cost", "₹", "rupees"],
    answer: () =>
      [
        "Pricing depends on the **station type** and sometimes the **time slot**.",
        "",
        "Fastest ways to confirm rates:",
        `- Check live station cards: ${url("/public/stations")}`,
        `- Start a booking (rates show during selection): ${PUBLIC_BOOKING_URL}`,
        "",
        "If you tell me what you want (Snooker / Pool / PS5 / Foosball) + when you’re coming, I’ll point you to the right place instantly.",
      ].join("\n"),
  },
  {
    id: "cancellation",
    title: "Cancellation & refund policy",
    patterns: ["refund", "refunds", "cancel", "cancellation", "reschedule", "change booking"],
    keywords: ["refund", "refunds", "cancel", "cancellation", "reschedule", "policy", "2 hours", "no-show"],
    answer: () =>
      [
        "Here’s the quick, practical version:",
        "- **2+ hours before your slot**: cancel/reschedule typically allowed without penalty (subject to payment gateway rules).",
        "- **Less than 2 hours**: may incur up to **50% booking fee** (peak slot blocking).",
        "- **No-shows**: generally non‑refundable.",
        "",
        `Need help with a refund? Email **${SUPPORT_EMAIL}** with name + phone + slot time + payment reference.`,
      ].join("\n"),
  },
  {
    id: "contact",
    title: "Contact details",
    patterns: ["contact", "phone number", "call", "email", "support", "helpdesk", "reach you"],
    keywords: ["contact", "phone", "call", "email", "support", "help"],
    answer: () =>
      [
        "Here you go:",
        `- Phone: ${GAMEHAUS_PHONE}`,
        `- Email: ${SUPPORT_EMAIL}`,
        `- Address: ${GAMEHAUS_ADDRESS}`,
      ].join("\n"),
  },
  {
    id: "location",
    title: "Location / directions",
    patterns: ["where are you", "location", "address", "direction", "google maps", "t nagar"],
    keywords: ["where", "location", "address", "maps", "t.nagar", "t nagar", "chennai"],
    answer: () =>
      [
        `We’re in **T. Nagar, Chennai**.`,
        "",
        `Address: ${GAMEHAUS_ADDRESS}`,
        "",
        "If you want, tell me where you’re coming from (e.g., “Teynampet”, “Guindy”, “Mylapore”) and I’ll suggest the easiest approach route/landmarks.",
      ].join("\n"),
  },
  {
    id: "tournaments",
    title: "Tournaments",
    patterns: ["tournament", "tournaments", "events", "competition", "league", "when next tournament"],
    keywords: ["tournament", "tournaments", "event", "events", "league", "competition"],
    answer: () =>
      [
        "Yes — we host tournaments and competitive nights.",
        "",
        `See what’s upcoming: ${url("/public/tournaments")}`,
        "",
        "If you tell me the game (snooker/pool/console) I’ll point you to the right listing faster.",
      ].join("\n"),
  },
  {
    id: "hours",
    title: "Timings / hours",
    patterns: ["timings", "hours", "open", "close", "closing time", "are you open today"],
    keywords: ["timings", "hours", "open", "close", "closing", "today", "tomorrow"],
    answer: () =>
      [
        "Best way to confirm timings is to check the **available slots** (that’s the source of truth):",
        `- ${PUBLIC_BOOKING_URL}`,
        "",
        `If you’re planning a specific time and want a quick confirmation, call ${GAMEHAUS_PHONE}.`,
      ].join("\n"),
  },
];

