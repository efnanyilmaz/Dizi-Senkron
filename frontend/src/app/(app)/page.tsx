import { MarqueeStrip } from "@/components/marquee-strip";
import { Hero } from "@/components/hero";
import { PosterShowcase } from "@/components/poster-showcase";
import { Features } from "@/components/features";
import { SpoilerDemo } from "@/components/spoiler-demo";
import { WatchTogetherDemo } from "@/components/watch-together-demo";
import { FaqSection } from "@/components/faq-section";
import { FinalCta } from "@/components/final-cta";

export default function Home() {
  return (
    <>
      <div className="mt-8">
        <MarqueeStrip />
      </div>
      <Hero />
      <PosterShowcase />
      <Features />
      <SpoilerDemo />
      <WatchTogetherDemo />
      <FaqSection />
      <FinalCta />
    </>
  );
}
