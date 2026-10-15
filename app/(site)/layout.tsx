import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMasterSettings, SUBMIT_EVENT_TOKEN } from "@/lib/data/site-settings";
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
  const [session, socialLinks, master, submitEventHref] = await Promise.all([
    auth(),
    getSocialLinks(),
    getMasterSettings(),
    getSubmitEventHref(),
  ]);
  const megaMenus = await getAllMegaMenus(master.mainNav.map((l) => l.slug));
  const footerColumns = master.footerColumns.map((c) => ({
    ...c,
    links: c.links.map((l) => (l.href === SUBMIT_EVENT_TOKEN ? { ...l, href: submitEventHref } : l)),
  }));

  return (
    <TripProvider signedIn={!!session?.user}>
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader
          mainNav={master.mainNav}
          utilityLinks={master.utilityLinks}
          mapLabel={master.mapLabel}
          bookLabel={master.bookButtonLabel}
          bookHref={master.bookButtonHref}
          megaMenus={megaMenus}
          account={
            !session?.user
              ? { href: "/login", label: "Sign in" }
              : session.user.roleKey === "MEMBER"
                ? { href: "/portal", label: "Member portal" }
                : session.user.roleKey === "VISITOR"
                  ? { href: "/account", label: "My account" }
                  : { href: "/cms", label: "Content Hub" }
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter socialLinks={socialLinks} signedIn={!!session?.user} master={{ ...master, footerColumns }} />
      </div>
    </TripProvider>
  );
}
