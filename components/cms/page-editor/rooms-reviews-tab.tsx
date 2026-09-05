"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import {
  addRoomAction,
  updateRoomAction,
  deleteRoomAction,
  addReviewAction,
  updateReviewAction,
  deleteReviewAction,
} from "@/app/cms/actions";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type RoomRow = PageDetail["rooms"][number];
type ReviewRow = PageDetail["reviews"][number];

function parseFeatures(json: string | null): string {
  if (!json) return "";
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.join(", ") : "";
  } catch {
    return "";
  }
}

export function RoomsReviewsTab({ page, readOnly }: { page: PageDetail; readOnly: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Rooms available</h3>
          <p className="text-xs text-neutral-400">
            Only shown on the consumer page once at least one room is added. Accommodation listings only.
          </p>
        </div>
        {page.rooms.map((room) => (
          <RoomCard key={room.id} room={room} readOnly={readOnly} pending={pending} startTransition={startTransition} refresh={refresh} />
        ))}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await addRoomAction(page.id, { name: "New room" });
                  refresh();
                } catch {
                  toast.error("Could not add room — check your permissions.");
                }
              })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add room
          </Button>
        )}
      </section>

      <section className="space-y-4 border-t pt-8">
        <div>
          <h3 className="text-sm font-semibold">Reviews</h3>
          <p className="text-xs text-neutral-400">Only shown on the consumer page once at least one review is added.</p>
        </div>
        {page.reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            readOnly={readOnly}
            pending={pending}
            startTransition={startTransition}
            refresh={refresh}
          />
        ))}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await addReviewAction(page.id, { authorName: "Guest", rating: 5, quote: "" });
                  refresh();
                } catch {
                  toast.error("Could not add review — check your permissions.");
                }
              })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add review
          </Button>
        )}
      </section>
    </div>
  );
}

function RoomCard({
  room,
  readOnly,
  pending,
  startTransition,
  refresh,
}: {
  room: RoomRow;
  readOnly: boolean;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
  refresh: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [imageUrl, setImageUrl] = useState(room.imageUrl ?? "");
  const [priceLabel, setPriceLabel] = useState(room.priceLabel ?? "");
  const [features, setFeatures] = useState(parseFeatures(room.features));

  function save() {
    startTransition(async () => {
      try {
        await updateRoomAction(room.id, {
          name,
          description,
          imageUrl,
          priceLabel,
          features: features
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        toast.success("Room saved");
        refresh();
      } catch {
        toast.error("Could not save room.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <fieldset disabled={readOnly} className="grid grid-cols-2 gap-3 disabled:opacity-60">
        <div className="col-span-2 space-y-1">
          <Label>Room name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Price</Label>
          <Input placeholder="e.g. £145/night" value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Photo</Label>
          <MediaPickerField value={imageUrl} onChange={setImageUrl} disabled={readOnly} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Features (comma separated)</Label>
          <Input placeholder="En-suite, Free WiFi, Dog friendly" value={features} onChange={(e) => setFeatures(e.target.value)} />
        </div>
      </fieldset>
      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteRoomAction(room.id);
                  refresh();
                } catch {
                  toast.error("Could not delete room.");
                }
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  readOnly,
  pending,
  startTransition,
  refresh,
}: {
  review: ReviewRow;
  readOnly: boolean;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
  refresh: () => void;
}) {
  const [authorName, setAuthorName] = useState(review.authorName);
  const [rating, setRating] = useState(String(review.rating));
  const [quote, setQuote] = useState(review.quote);
  const [reviewDate, setReviewDate] = useState(review.reviewDate ? review.reviewDate.toISOString().slice(0, 10) : "");

  function save() {
    startTransition(async () => {
      try {
        await updateReviewAction(review.id, {
          authorName,
          rating: Number(rating),
          quote,
          reviewDate: reviewDate || null,
        });
        toast.success("Review saved");
        refresh();
      } catch {
        toast.error("Could not save review.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <fieldset disabled={readOnly} className="grid grid-cols-2 gap-3 disabled:opacity-60">
        <div className="space-y-1">
          <Label>Reviewer name</Label>
          <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Rating</Label>
          <Select value={rating} onValueChange={(v) => v && setRating(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 4, 3, 2, 1].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  <span className="flex items-center gap-1">
                    {n} <Star className="h-3 w-3 fill-current" />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Quote</Label>
          <Textarea rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </div>
      </fieldset>
      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteReviewAction(review.id);
                  refresh();
                } catch {
                  toast.error("Could not delete review.");
                }
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
