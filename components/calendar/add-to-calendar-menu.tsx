"use client";

import { CalendarPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildIcsFile, googleCalendarUrl, outlookCalendarUrl, type CalendarEventInput } from "@/lib/calendar-export";

function slugifyFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

export function AddToCalendarMenu({
  event,
  path,
  compact = false,
}: {
  event: CalendarEventInput;
  // Site-relative path (e.g. "/things-to-do/some-event") this event's own
  // page lives at — resolved to an absolute URL client-side, since the
  // origin isn't known during server rendering.
  path?: string;
  compact?: boolean;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullEvent: CalendarEventInput = path ? { ...event, url: `${origin}${path}` } : event;

  const downloadIcs = () => {
    const ics = buildIcsFile(fullEvent);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugifyFilename(event.title)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={
              compact
                ? "inline-flex size-7 items-center justify-center rounded-full border border-somerset-green text-somerset-green transition-colors hover:bg-somerset-green/10"
                : "inline-flex items-center gap-1.5 rounded-full border border-somerset-green px-3 py-1 text-xs font-medium text-somerset-green transition-colors hover:bg-somerset-green/10"
            }
            aria-label="Add to calendar"
          >
            <CalendarPlus className="size-3.5" />
            {!compact && "Add to calendar"}
          </button>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuItem onClick={downloadIcs}>Download .ics</DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a href={googleCalendarUrl(fullEvent)} target="_blank" rel="noopener noreferrer">
              Google Calendar
            </a>
          }
        />
        <DropdownMenuItem
          render={
            <a href={outlookCalendarUrl(fullEvent)} target="_blank" rel="noopener noreferrer">
              Outlook
            </a>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
