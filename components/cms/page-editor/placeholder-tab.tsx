import { Construction } from "lucide-react";

export function PlaceholderTab({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center text-neutral-400">
      <Construction className="h-8 w-8" />
      <p className="text-sm font-medium text-neutral-500">{title}</p>
      <p className="text-xs">Arrives in {phase} of the build.</p>
    </div>
  );
}
