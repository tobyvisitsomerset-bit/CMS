"use client";

import { useSyncExternalStore, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DISPLAY_CHANGE_EVENT,
  DISPLAY_KEYS,
  DISPLAY_STORAGE_KEY,
  cleanPrefs,
  type DisplayKey,
  type DisplayPrefs,
} from "@/lib/display-prefs";

// The current choices as a JSON string. A string (not an object) so React can
// tell when it changed. Falls back to memory when storage is blocked, so the
// buttons still work for the visit.
let memory: string | null = null;

function readStored(): string {
  if (memory !== null) return memory;
  try {
    memory = JSON.stringify(cleanPrefs(JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY) || "{}")));
  } catch {
    memory = "{}";
  }
  return memory;
}

function subscribe(onChange: () => void) {
  window.addEventListener(DISPLAY_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISPLAY_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function save(next: DisplayPrefs) {
  const root = document.documentElement;
  for (const key of DISPLAY_KEYS) {
    const v = next[key];
    if (v) root.setAttribute(`data-a11y-${key}`, v);
    else root.removeAttribute(`data-a11y-${key}`);
  }
  memory = JSON.stringify(next);
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(DISPLAY_STORAGE_KEY);
    else localStorage.setItem(DISPLAY_STORAGE_KEY, memory);
  } catch {
    // Storage blocked: the choice still applies until the page is closed.
  }
  window.dispatchEvent(new Event(DISPLAY_CHANGE_EVENT));
}

const TEXT_SIZES = [
  { value: undefined, label: "Standard" },
  { value: "112", label: "Large" },
  { value: "125", label: "Larger" },
  { value: "150", label: "Largest" },
] as const;

const COLOUR_HELP = [
  { value: undefined, label: "Off", hint: "" },
  { value: "protan", label: "Red-weak", hint: "Protanopia" },
  { value: "deutan", label: "Green-weak", hint: "Deuteranopia" },
  { value: "tritan", label: "Blue-weak", hint: "Tritanopia" },
] as const;

const SWITCHES: { key: DisplayKey; value: string; label: string; help: string }[] = [
  { key: "grey", value: "1", label: "Greyscale", help: "Shows the whole site in black, white and grey." },
  { key: "contrast", value: "high", label: "Higher contrast", help: "Darker text, stronger borders and a bolder outline around the item you have selected." },
  { key: "font", value: "easy", label: "Easy-read font", help: "A typeface designed so letters are harder to confuse." },
  { key: "space", value: "wide", label: "Wider text spacing", help: "More space between lines, words and letters." },
  { key: "motion", value: "stop", label: "Stop movement", help: "Switches off animation and stops the photo slideshow on the home page." },
];

const optionClass = (on: boolean) =>
  cn(
    "rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900",
    on ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 bg-white text-stone-800 hover:bg-cool-grey",
  );

export function DisplaySettingsPanel({ heading, intro }: { heading?: string; intro?: string }) {
  const stored = useSyncExternalStore(subscribe, readStored, () => "{}");
  const prefs = cleanPrefs(JSON.parse(stored));
  const [announce, setAnnounce] = useState("");

  function change(key: DisplayKey, value: string | undefined, said: string) {
    const next = { ...prefs };
    if (value) next[key] = value;
    else delete next[key];
    save(next);
    setAnnounce(said);
  }

  const anyOn = Object.keys(prefs).length > 0;

  return (
    <section className="px-6 py-10" aria-labelledby="display-settings-heading">
      <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="display-settings-heading" className="font-serif text-3xl font-black text-stone-900">
          {heading || "Make this site easier to use"}
        </h2>
        <p className="mt-2 text-stone-700">
          {intro || "Change how the site looks to suit you. Your choices are saved on this device only, apply to every page, and need no account."}
        </p>

        <div className="mt-6 space-y-7">
          <div role="group" aria-labelledby="ds-text">
            <h3 id="ds-text" className="text-sm font-bold text-stone-900">
              Text size
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEXT_SIZES.map((o) => {
                const on = (prefs.text ?? undefined) === o.value;
                return (
                  <button
                    key={o.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => change("text", o.value, `Text size: ${o.label}`)}
                    className={optionClass(on)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-stone-600">You can also zoom with Ctrl and + (Cmd and + on a Mac).</p>
          </div>

          <div role="group" aria-labelledby="ds-cb">
            <h3 id="ds-cb" className="text-sm font-bold text-stone-900">
              Colour-blind help
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOUR_HELP.map((o) => {
                const on = (prefs.cb ?? undefined) === o.value;
                return (
                  <button
                    key={o.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => change("cb", o.value, `Colour-blind help: ${o.label}`)}
                    className={optionClass(on)}
                  >
                    {o.label}
                    {o.hint && <span className="sr-only"> ({o.hint})</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-stone-600">
              Changes colours so those that look alike are easier to tell apart. It helps some people more than others: if it does not suit you, switch it off.
            </p>
          </div>

          <div role="group" aria-labelledby="ds-more">
            <h3 id="ds-more" className="text-sm font-bold text-stone-900">
              More options
            </h3>
            <ul className="mt-2 divide-y divide-stone-200 rounded-2xl border border-stone-200">
              {SWITCHES.map((s) => {
                const on = prefs[s.key] === s.value;
                return (
                  <li key={s.key} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p id={`ds-${s.key}`} className="text-sm font-semibold text-stone-900">
                        {s.label}
                      </p>
                      <p id={`ds-${s.key}-help`} className="text-sm text-stone-600">
                        {s.help}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-labelledby={`ds-${s.key}`}
                      aria-describedby={`ds-${s.key}-help`}
                      onClick={() => change(s.key, on ? undefined : s.value, `${s.label}: ${on ? "off" : "on"}`)}
                      className={cn(
                        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900",
                        on ? "border-somerset-green bg-somerset-green" : "border-stone-500 bg-stone-200",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-5 border border-somerset-green" : "translate-x-0.5 border border-stone-500")}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!anyOn}
            onClick={() => {
              save({});
              setAnnounce("All display settings reset");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-stone-400 px-5 py-2.5 text-sm font-bold text-stone-900 hover:bg-cool-grey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Reset everything
          </button>
          <p className="text-sm text-stone-600">Saved on this device only. Nothing is sent to us.</p>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>
    </section>
  );
}
