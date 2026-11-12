import Link from "next/link";
import { BedDouble, Ticket } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";

// The purple band under the home photo: four picture tiles that lead into the
// main sections, then wide booking buttons. As on the current site.
export function HomeTiles({
  tiles,
  buttons,
}: {
  tiles: { label: string; url: string; imageUrl: string | null }[];
  buttons: { label: string; url: string; icon?: string }[];
}) {
  return (
    <section className="bg-damson px-4 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1440px]">
        {tiles.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.label}>
                <Link href={t.url || "#"} className="group relative block aspect-[5/3] overflow-hidden rounded-sm bg-deep-green">
                  <Img src={t.imageUrl} alt="" label="" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/15" aria-hidden="true" />
                  <span className="absolute inset-0 flex items-center justify-center px-3 text-center font-sans text-xl font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.6)] sm:text-2xl">
                    {t.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {buttons.length > 0 && (
          <div className="mt-3 space-y-3">
            {buttons.map((b) => (
              <Link
                key={b.label}
                href={b.url || "#"}
                className="flex items-center justify-center gap-3 rounded-lg bg-white py-4 text-lg font-bold text-damson transition-colors hover:bg-cool-grey"
              >
                {b.icon === "bed" ? <BedDouble className="size-5" aria-hidden="true" /> : <Ticket className="size-5" aria-hidden="true" />}
                {b.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
