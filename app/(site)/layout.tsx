import { auth } from "@/lib/auth";
import { MAIN_NAV, MAP_NAV, UTILITY_NAV } from "@/lib/site-nav";
import { TripProvider } from "@/lib/trip-context";
import { getSocialLinks, getAllMegaMenus } from "@/lib/data/pages";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [session, socialLinks, megaMenus] = await Promise.all([
    auth(),
    getSocialLinks(),
    getAllMegaMenus(MAIN_NAV.map((l) => l.slug)),
  ]);

  return (
    <TripProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader mainNav={MAIN_NAV} utilityNav={UTILITY_NAV} mapNav={MAP_NAV} megaMenus={megaMenus} />
        <main className="flex-1">{children}</main>
        <SiteFooter socialLinks={socialLinks} signedIn={!!session?.user} />
      </div>
    </TripProvider>
  );
}
