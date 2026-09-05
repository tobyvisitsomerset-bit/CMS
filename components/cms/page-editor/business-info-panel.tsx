import { Calendar, Clock, ExternalLink, Mail, MapPin, Phone, Ticket } from "lucide-react";
import type { BusinessInfo } from "@/lib/kentico-item-fields";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Row({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-neutral-700">
      <Icon className="mt-0.5 size-4 shrink-0 text-neutral-400" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function BusinessInfoPanel({ info }: { info: BusinessInfo }) {
  const fullAddress = [info.address, info.town, info.postcode].filter(Boolean).join(", ");
  const mapsHref =
    info.mapLat && info.mapLng
      ? `https://www.google.com/maps/search/?api=1&query=${info.mapLat},${info.mapLng}`
      : fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
        : null;

  return (
    <div className="space-y-3 rounded-lg border bg-neutral-50 p-4">
      <h3 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Details</h3>

      {(info.startDate || info.endDate) && (
        <Row icon={Calendar}>
          {info.startDate ? formatDate(info.startDate) : ""}
          {info.endDate && info.endDate !== info.startDate ? ` – ${formatDate(info.endDate)}` : ""}
        </Row>
      )}

      {fullAddress && (
        <Row icon={MapPin}>
          <span>{fullAddress}</span>
          {mapsHref && (
            <a href={mapsHref} target="_blank" rel="noreferrer" className="ml-1.5 inline text-emerald-700 underline underline-offset-2">
              Get directions
            </a>
          )}
        </Row>
      )}

      {info.phone && (
        <Row icon={Phone}>
          <a href={`tel:${info.phone.replace(/\s+/g, "")}`} className="hover:underline">
            {info.phone}
          </a>
        </Row>
      )}

      {info.email && (
        <Row icon={Mail}>
          <a href={`mailto:${info.email}`} className="break-all hover:underline">
            {info.email}
          </a>
        </Row>
      )}

      {info.openingTimes && (
        <Row icon={Clock}>
          <span>{info.openingTimes}</span>
        </Row>
      )}

      {info.admission && (
        <Row icon={Ticket}>
          <span>{info.admission}</span>
        </Row>
      )}

      {info.website && (
        <Row icon={ExternalLink}>
          <a href={info.website} target="_blank" rel="noreferrer" className="break-all text-emerald-700 hover:underline">
            Visit website
          </a>
        </Row>
      )}

      {info.bookingUrl && (
        <a
          href={info.bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block w-full rounded-md bg-emerald-800 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-900"
        >
          {info.bookingLabel}
        </a>
      )}
    </div>
  );
}
