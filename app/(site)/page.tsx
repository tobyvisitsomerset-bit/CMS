import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getExploreAreaTiles, getTownOverviewPages } from "@/lib/data/pages";
import { getListingsByCategory, getUpcomingEvents } from "@/lib/data/listings";
import { HomepageHero } from "@/components/site/homepage-hero";
import { ExploreAreaTiles } from "@/components/site/explore-area-tiles";
import { HomeTeaserSection } from "@/components/site/home-teaser-section";
import { TownsTileRow } from "@/components/site/towns-tile-row";
import { MapCta } from "@/components/site/map-cta";
import { InteractiveEventCalendar } from "@/components/cms/page-builder/interactive-event-calendar";
import { InteractiveListingGrid } from "@/components/cms/page-builder/interactive-listing-grid";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("home");
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.subtitle || undefined,
    openGraph: {
      title: page.ogTitle || page.seoTitle || page.title,
      description: page.ogDescription || page.seoDescription || undefined,
      images: page.socialShareImage ? [page.socialShareImage] : undefined,
    },
  };
}

export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page || page.status !== "PUBLISHED") notFound();

  const heroBlock = page.contentBlocks.find((b) => b.type === "hero");
  const heroConfig: { heading?: string; subheading?: string; ctaLabel?: string } = heroBlock
    ? JSON.parse(heroBlock.config || "{}")
    : {};

  const [areaTiles, towns, events, accommodation] = await Promise.all([
    getExploreAreaTiles(),
    getTownOverviewPages(),
    getUpcomingEvents(4),
    getListingsByCategory("ACCOMMODATION", 4),
  ]);

  return (
    <>
      <HomepageHero heading={heroConfig.heading} subheading={heroConfig.subheading} ctaLabel={heroConfig.ctaLabel} />
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
        <ExploreAreaTiles tiles={areaTiles} />
        <HomeTeaserSection title="On this week" seeAllHref="/festivals-and-events">
          <InteractiveEventCalendar config={{}} events={events} />
        </HomeTeaserSection>
        <HomeTeaserSection title="Somewhere to stay" seeAllHref="/places-to-stay">
          <InteractiveListingGrid config={{}} items={accommodation} />
        </HomeTeaserSection>
        <TownsTileRow towns={towns} />
        <MapCta />
      </div>
    </>
  );
}
