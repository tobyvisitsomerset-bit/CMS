import { Img } from "@/components/cms/page-builder/listing-ui";

export type RoomLike = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string | null;
  features: string | null;
  bookingUrl: string | null;
};

// Rooms / accommodation options on a listing. Each room can carry its own
// booking link; if it doesn't, the listing's main booking link is used, and
// failing that the visitor is pointed at the enquiry form (when one exists).
export function RoomsSection({
  rooms,
  fallbackBookingUrl,
  hasEnquiryForm,
  embedded,
}: {
  rooms: RoomLike[];
  fallbackBookingUrl?: string | null;
  hasEnquiryForm: boolean;
  /** Rendered on its own band (block / plain pages) rather than inside the detail layout. */
  embedded?: boolean;
}) {
  if (rooms.length === 0) return null;

  const list = (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-black text-stone-900">Rooms</h2>
      <div className="space-y-3">
        {rooms.map((room) => {
          let features: string[] = [];
          try {
            const parsed = room.features ? JSON.parse(room.features) : [];
            features = Array.isArray(parsed) ? parsed : [];
          } catch {
            features = [];
          }
          const href = room.bookingUrl || fallbackBookingUrl || null;
          return (
            <div key={room.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-stone-200 bg-white p-4">
              <Img src={room.imageUrl} alt="" label={room.name} className="h-20 w-24 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg font-black text-stone-900">{room.name}</h3>
                {room.description && <p className="text-sm text-stone-500">{room.description}</p>}
                {features.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {features.map((f) => (
                      <span key={f} className="rounded-full bg-cool-grey px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {room.priceLabel && <span className="font-serif text-xl font-black text-stone-900">{room.priceLabel}</span>}
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-damson px-5 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    Book this room
                  </a>
                ) : hasEnquiryForm ? (
                  <a href="#enquire" className="rounded-full bg-damson px-5 py-2 text-sm font-bold text-white hover:opacity-90">
                    Enquire
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  if (!embedded) return list;
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">{list}</div>
    </div>
  );
}
