import { HomepageSearchBar } from "./homepage-search-bar";

export function HomepageHero({
  heading,
  subheading,
  ctaLabel,
}: {
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="relative flex min-h-[26rem] items-center overflow-hidden bg-gradient-to-br from-somerset-green to-deep-green px-6 py-16 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl text-white">
          <h1 className="font-serif text-4xl font-black sm:text-5xl">{heading ?? "Visit Somerset"}</h1>
          {subheading && <p className="mt-3 text-lg text-white/90">{subheading}</p>}
          {ctaLabel && (
            <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900">
              {ctaLabel}
            </span>
          )}
        </div>
        <HomepageSearchBar />
      </div>
    </div>
  );
}
