import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAIN_NAV, MAP_NAV, UTILITY_NAV } from "@/lib/site-nav";
import { TripProvider } from "@/lib/trip-context";
import { getSocialLinks, getAllMegaMenus } from "@/lib/data/pages";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

const getSubmitEventHref = unstable_cache(
  async () => {
    const r = await prisma.page.findFirst({
      where: {
        status: "PUBLISHED",
        slug: { startsWith: "festivals-events/" },
        title: { contains: "Submit", mode: "insensitive" },
      },
      select: { slug: true },
    });
    return r ? `/${r.slug}` : "/festivals-events";
  },
  ["submit-event-href"],
  { revalidate: 3600 },
);

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [session, socialLinks, megaMenus, submitEventHref] = await Promise.all([
    auth(),
    getSocialLinks(),
    getAllMegaMenus(MAIN_NAV.map((l) => l.slug)),
    getSubmitEventHref(),
  ]);

  return (
    <TripProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader mainNav={MAIN_NAV} utilityNav={UTILITY_NAV} mapNav={MAP_NAV} megaMenus={megaMenus} />
        <main className="flex-1">{children}</main>
        <SiteFooter socialLinks={socialLinks} signedIn={!!session?.user} submitEventHref={submitEventHref} />
      </div>
    </TripProvider>
  );
}
