// Visitor display settings (text size, greyscale, colour-blind help, ...).
// Chosen on the Accessibility page, kept in the visitor's own browser, and
// applied as data-a11y-* attributes on <html> so plain CSS (app/globals.css)
// does the work on every page. Nothing is sent to the server.

export const DISPLAY_STORAGE_KEY = "vs-display";
export const DISPLAY_CHANGE_EVENT = "vs-display-change";

export const DISPLAY_KEYS = ["text", "grey", "cb", "contrast", "font", "space", "motion"] as const;
export type DisplayKey = (typeof DISPLAY_KEYS)[number];
export type DisplayPrefs = Partial<Record<DisplayKey, string>>;

// The only values each setting may hold. Anything else in storage is ignored.
export const DISPLAY_VALUES: Record<DisplayKey, readonly string[]> = {
  text: ["112", "125", "150"],
  grey: ["1"],
  cb: ["protan", "deutan", "tritan"],
  contrast: ["high"],
  font: ["easy"],
  space: ["wide"],
  motion: ["stop"],
};

export function cleanPrefs(raw: unknown): DisplayPrefs {
  const out: DisplayPrefs = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of DISPLAY_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" && DISPLAY_VALUES[key].includes(v)) out[key] = v;
  }
  return out;
}

// Runs in <head> before the page is painted, so a saved choice never flashes
// the standard look first. Kept tiny and dependency-free on purpose.
export const DISPLAY_INLINE_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  DISPLAY_STORAGE_KEY,
)})||"{}"),d=document.documentElement,k=${JSON.stringify(DISPLAY_KEYS)};for(var i=0;i<k.length;i++){var v=s[k[i]];if(typeof v==="string"&&/^[a-z0-9]+$/.test(v))d.setAttribute("data-a11y-"+k[i],v)}}catch(e){}})();`;
