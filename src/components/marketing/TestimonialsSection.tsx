import * as React from "react";

import { Star } from "lucide-react";

import Reveal from "@/components/motion/Reveal";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";

type Testimonial = {
  quote: string;
  name: string;
  tag: string;
  rating?: 4 | 5;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Clean tables, smooth booking, and the vibe is premium. Walked in, started on time—zero chaos even on a busy night.",
    name: "Arjun",
    tag: "Snooker regular",
    rating: 5,
  },
  {
    quote:
      "PS5 sessions feel super polished. Comfortable setup, great lighting, and staff keeps the flow moving without interrupting the game.",
    name: "Nila",
    tag: "Console nights",
    rating: 5,
  },
  {
    quote:
      "Love the real-time availability. No guessing, no waiting around—just book, show up, and play.",
    name: "Karthik",
    tag: "Weekend group",
    rating: 5,
  },
  {
    quote:
      "Feels like a high-tech lounge. Great atmosphere, fair rates, and the whole place looks and runs professional.",
    name: "Shreya",
    tag: "First-time visitor",
    rating: 5,
  },
  {
    quote:
      "Tournament nights are intense—in a good way. Great equipment and a clean flow from match to match.",
    name: "Vikram",
    tag: "Competitive player",
    rating: 5,
  },
];

function Stars({ rating = 5 }: { rating?: 4 | 5 }) {
  const full = Array.from({ length: rating }, (_, i) => i);
  const empty = Array.from({ length: 5 - rating }, (_, i) => i);
  return (
    <div className="flex items-center gap-1">
      {full.map((i) => (
        <Star key={`f-${i}`} className="h-4 w-4 text-gamehaus-pink fill-gamehaus-pink" />
      ))}
      {empty.map((i) => (
        <Star key={`e-${i}`} className="h-4 w-4 text-gray-600" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [isHovering, setIsHovering] = React.useState(false);

  React.useEffect(() => {
    if (!api) return;

    const interval = window.setInterval(() => {
      if (isHovering) return;
      api.scrollNext();
    }, 4200);

    return () => window.clearInterval(interval);
  }, [api, isHovering]);

  return (
    <section className="w-full max-w-6xl mx-auto px-4">
      <Reveal>
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.25em] text-gray-400">TESTIMONIALS</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white tracking-tight">
            Players love the <span className="bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple animate-text-gradient">flow</span>
          </h2>
          <p className="mt-4 text-gray-300 max-w-3xl mx-auto leading-relaxed">
            A premium gaming lounge isn’t just equipment—it’s timing, comfort, and a system that feels effortless.
          </p>
        </div>
      </Reveal>

      <Reveal delayMs={120}>
        <div
          className="relative overflow-hidden rounded-3xl border border-gamehaus-purple/30 bg-gradient-to-br from-black/60 via-gamehaus-purple/10 to-black/60 backdrop-blur-md p-5 sm:p-8"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
          <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 -top-[45%] h-[45%] bg-gradient-to-b from-transparent via-white/10 to-transparent blur-md opacity-35 animate-scanner" />
          </div>

          <div className="relative">
            <Carousel
              setApi={(a) => setApi(a)}
              opts={{ align: "start", loop: true }}
              className="px-10 sm:px-14"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((t, idx) => (
                  <CarouselItem key={idx} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <div className="group h-full rounded-2xl border border-gamehaus-purple/25 bg-black/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-gamehaus-purple/45 hover:shadow-2xl hover:shadow-gamehaus-purple/25 hover:-translate-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <Stars rating={t.rating} />
                        <span className="text-xs text-gray-400">{t.tag}</span>
                      </div>
                      <p className="mt-4 text-sm text-gray-200 leading-relaxed">
                        <span className="text-gamehaus-lightpurple/90">“</span>
                        {t.quote}
                        <span className="text-gamehaus-lightpurple/90">”</span>
                      </p>
                      <div className="mt-6 flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full border border-gamehaus-purple/25 bg-black/60 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gamehaus-purple/15 to-gamehaus-magenta/10" />
                          <span className="relative text-sm font-semibold text-white">
                            {t.name.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                          <p className="text-xs text-gray-400 truncate">Verified visitor</p>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className="border-gamehaus-purple/30 bg-black/60 text-gray-200 hover:bg-black/80 hover:text-white hover:border-gamehaus-purple/50" />
              <CarouselNext className="border-gamehaus-purple/30 bg-black/60 text-gray-200 hover:bg-black/80 hover:text-white hover:border-gamehaus-purple/50" />
            </Carousel>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

