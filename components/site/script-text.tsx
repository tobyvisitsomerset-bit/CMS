import { Fragment } from "react";
import { cn } from "@/lib/utils";

// Text where *words in asterisks* use the script font, as the Title box on a
// page form does ("Make words italic to use script font"). New lines in the
// text become line breaks.
export function ScriptText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/(\*[^*]+\*)/g).map((part, i) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
              <span key={i} className={cn("font-script font-normal", className)}>
                {part.slice(1, -1)}
              </span>
            ) : (
              <Fragment key={i}>{part}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}
