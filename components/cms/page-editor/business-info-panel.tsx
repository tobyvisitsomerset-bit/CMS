import { Calendar, Clock, ExternalLink, Mail, MapPin, Phone, Ticket } from "lucide-react";
import type { BusinessInfo } from "@/lib/kentico-item-fields";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Row({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm text-neutral-700">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 pt-1">{children}</div>
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
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      <h3 className="text-[11px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">Details</h3>

      <div className="space-y-3.5">
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
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 inline font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:decoration-emerald-500"
              >
                Get directions
              </a>
            )}
          </Row>
        )}

        {info.phone && (
          <Row icon={Phone}>
            <a href={`tel:${info.phone.replace(/\s+/g, "")}`} className="hover:text-emerald-700 hover:underline">
              {info.phone}
            </a>
          </Row>
        )}

        {info.email && (
          <Row icon={Mail}>
            <a href={`mailto:${info.email}`} className="break-all hover:text-emerald-700 hover:underline">
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
            <a
              href={info.website}
              target="_blank"
              rel="noreferrer"
              className="break-all font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:decoration-emerald-500"
            >
              Visit website
            </a>
          </Row>
        )}
      </div>

      {info.bookingUrl && (
        <a
          href={info.bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-xl bg-emerald-800 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition-colors hover:bg-emerald-900"
        >
          {info.bookingLabel}
        </a>
      )}
    </div>
  );
}
