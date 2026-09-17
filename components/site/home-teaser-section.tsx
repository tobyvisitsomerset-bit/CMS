import Link from "next/link";

export function HomeTeaserSection({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  seeAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-black text-stone-900">{title}</h2>
        <Link href={seeAllHref} className="text-sm font-medium text-somerset-green hover:underline">
          See all &rarr;
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">{children}</div>
    </section>
  );
}
