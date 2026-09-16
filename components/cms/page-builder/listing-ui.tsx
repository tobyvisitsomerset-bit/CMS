import { cn } from "@/lib/utils";

export function tierBadgeLabel(tier: string | null): string | null {
  if (tier === "PLATINUM") return "Platinum Member";
  if (tier === "GOLD") return "Gold Member";
  return null;
}

export function Img({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) return <div className={cn("bg-gradient-to-br from-somerset-green/20 to-somerset-green/30", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn("object-cover", className)} />;
}
