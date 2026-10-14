import { cn } from "@/lib/utils";

export function tierBadgeLabel(tier: string | null): string | null {
  if (tier === "PLATINUM") return "Platinum Member";
  if (tier === "GOLD") return "Gold Member";
  return null;
}

export function Img({
  src,
  alt,
  className,
  label,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  /** Text for the placeholder tile shown when there is no real photo (the mockup pack's own "PHOTO · NAME" convention). */
  label?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-cool-grey to-stone-200/80 px-3 text-center text-[10px] font-medium tracking-[0.14em] text-stone-500 uppercase",
          className,
        )}
      >
        <span className="line-clamp-2">{label ? `Photo · ${label}` : "Photo"}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn("object-cover", className)} />;
}
