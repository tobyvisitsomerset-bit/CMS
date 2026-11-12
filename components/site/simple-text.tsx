import Link from "next/link";

// Plain text with a few conventions, so a text block can hold a real document
// without anyone writing HTML:
//   blank line        = new paragraph
//   ## Heading        = a sub-heading
//   - item            = a bulleted list (every line of the paragraph starts "- ")
//   [label](/page)    = a link; https:// addresses open in a new tab
//   name@example.com  = a mail link

const TOKEN = /(\[[^\]]+\]\((?:\/|https?:\/\/)[^)\s]+\)|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
const EMAIL = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;
const linkClass = "font-semibold text-somerset-green underline hover:text-deep-green";

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        const link = part.match(LINK);
        if (link) {
          const [, label, href] = link;
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={linkClass}>
              {label}
            </Link>
          ) : (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          );
        }
        if (EMAIL.test(part)) {
          return (
            <a key={i} href={`mailto:${part}`} className={linkClass}>
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

export function SimpleText({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h4 key={i} className="pt-3 font-serif text-xl font-black text-stone-900">
              {block.slice(3)}
            </h4>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-6">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={block} />
          </p>
        );
      })}
    </div>
  );
}
