export type CalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  url?: string;
  start: Date;
  end?: Date;
  /** Kentico stores date-only events at midnight — those are written as all-day entries. */
  allDay?: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function resolveEnd(event: CalendarEventInput): Date {
  if (event.end) return event.end;
  return new Date(event.start.getTime() + (event.allDay ? DAY_MS : HOUR_MS));
}

// YYYYMMDDTHHmmssZ, per RFC 5545.
function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// YYYYMMDD in the event's own (local) calendar day.
function formatIcsDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function nextDay(d: Date): Date {
  const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return n;
}

// Escapes \, ; , and newlines per RFC 5545 §3.3.11.
function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function veventLines(event: CalendarEventInput, opts: { reminderDayBefore?: boolean }): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${crypto.randomUUID()}@visitsomerset.co.uk`, `DTSTAMP:${formatIcsDate(new Date())}`];
  if (event.allDay) {
    // All-day entries use DATE values, and DTEND is exclusive (the day after).
    const endDay = event.end ? nextDay(event.end) : nextDay(event.start);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDay(event.start)}`, `DTEND;VALUE=DATE:${formatIcsDay(endDay)}`);
  } else {
    lines.push(`DTSTART:${formatIcsDate(event.start)}`, `DTEND:${formatIcsDate(resolveEnd(event))}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  if (opts.reminderDayBefore) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(event.title)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsCalendar(events: CalendarEventInput[], opts: { reminderDayBefore?: boolean } = {}): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Visit Somerset//Trip Planner//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) lines.push(...veventLines(e, opts));
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function buildIcsFile(event: CalendarEventInput, opts: { reminderDayBefore?: boolean } = {}): string {
  return buildIcsCalendar([event], opts);
}

export function googleCalendarUrl(event: CalendarEventInput): string {
  const dates = event.allDay
    ? `${formatIcsDay(event.start)}/${formatIcsDay(event.end ? nextDay(event.end) : nextDay(event.start))}`
    : `${formatIcsDate(event.start)}/${formatIcsDate(resolveEnd(event))}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarEventInput): string {
  const end = resolveEnd(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: end.toISOString(),
  });
  if (event.allDay) params.set("allday", "true");
  if (event.description) params.set("body", event.description);
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
