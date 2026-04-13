import { ArchiveDemoSlice } from "@/components/archive/archive-demo-slice";
import { HomeHero } from "@/components/home/home-hero";
import { FRAMINGS } from "@/lib/taxonomy";

export default function Home() {
  const framingTypeCount = Object.keys(FRAMINGS).length;

  return (
    <div className="flex flex-col gap-12 pb-12 sm:gap-16 sm:pb-16 lg:gap-20">
      <HomeHero />

      <ArchiveDemoSlice framingTypeCount={framingTypeCount} spotlightShotId={null} />
    </div>
  );
}
