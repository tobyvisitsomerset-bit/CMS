"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Download } from "lucide-react";
import { buildIcsCalendar, googleCalendarUrl, outlookCalendarUrl, type CalendarEventInput } from "@/lib/calendar-export";
import { cn } from "@/lib/utils";

function slugifyFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

function download(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// "Add to calendar" menu from the mockup pack (screen 09): Apple Calendar,
// Google Calendar, Outlook and a plain .ics download, plus an opt-in
// day-before reminder (written into the .ics as a real VALARM) and, where a
// whole season of related events exists, one file with all of them.
export function AddToCalendarMenu({
  event,
  path,
  compact = false,
  season,
  className,
}: {
  event: CalendarEventInput;
  // Site-relative path (e.g. "/things-to-do/some-event") this event's own
  // page lives at — resolved to an absolute URL client-side, since the
  // origin isn't known during server rendering.
  path?: string;
  compact?: boolean;
  season?: { label: string; events: CalendarEventInput[] };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [remind, setRemind] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullEvent: CalendarEventInput = path ? { ...event, url: `${origin}${path}` } : event;
  const filename = `${slugifyFilename(event.title)}.ics`;
  const getIcs = () => download(filename, buildIcsCalendar([fullEvent], { reminderDayBefore: remind }));

  const itemClass = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-800 transition-colors hover:bg-cool-grey";
  const badge = "flex size-6 items-center justify-center rounded-full bg-cool-grey text-xs font-bold text-stone-700";

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Add to calendar"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "inline-flex size-9 items-center justify-center rounded-full border border-stone-300 text-stone-700 transition-colors hover:border-somerset-green hover:text-somerset-green"
            : "inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-800 transition-colors hover:border-somerset-green"
        }
      >
        <CalendarPlus className="size-4" />
        {!compact && "Add to calendar"}
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-40 mt-2 w-72 rounded-3xl border border-stone-200 bg-white p-3 shadow-xl">
          <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Add this event to</p>
          <button type="button" role="menuitem" className={itemClass} onClick={() => { getIcs(); setOpen(false); }}>
            <span className={badge}>A</span> Apple Calendar
          </button>
          <a
            role="menuitem"
            className={itemClass}
            href={googleCalendarUrl(fullEvent)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className={badge}>G</span> Google Calendar
          </a>
          <a
            role="menuitem"
            className={itemClass}
            href={outlookCalendarUrl(fullEvent)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className={badge}>O</span> Outlook
          </a>
          <button type="button" role="menuitem" className={itemClass} onClick={() => { getIcs(); setOpen(false); }}>
            <span className={badge}>
              <Download className="size-3" />
            </span>
            Download .ics file
          </button>
          <div className="my-2 border-t border-stone-100" />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-cool-grey">
            <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="size-4 accent-[#3d685b]" />
            Remind me the day before
          </label>
          {season && season.events.length > 1 && (
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, "text-stone-700")}
              onClick={() => {
                download(`${slugifyFilename(season.label)}.ics`, buildIcsCalendar(season.events, { reminderDayBefore: remind }));
                setOpen(false);
              }}
            >
              <span className={badge}>+</span>
              Add the whole {season.label} ({season.events.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
