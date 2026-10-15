"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setClubMembershipAction } from "./actions";

export function ClubCard({ joined: initial, configured }: { joined: boolean; configured: boolean }) {
  const [joined, setJoined] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await setClubMembershipAction(!joined);
      if (res.ok) {
        setJoined(res.joined);
        toast.success(res.joined ? "Welcome to the Somerset Club" : "You have left the Somerset Club");
      } else {
        toast.error("Please sign in again.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-serif text-xl font-black">Somerset Club</h2>
      <p className="mt-1 text-sm text-stone-600">
        {joined
          ? "You are in the club. You will get ideas, events and offers from Visit Somerset by email."
          : "Join for ideas, events and offers from Visit Somerset by email, a few times a month. Free, and you can leave at any time."}
      </p>
      {joined && !configured && (
        <p className="mt-2 text-xs text-stone-500">Your choice is saved. Emails start once the team switches the mailing list on.</p>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          joined
            ? "mt-4 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:bg-stone-50 disabled:opacity-60"
            : "mt-4 rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        }
      >
        {joined ? "Leave the club" : "Join the Somerset Club"}
      </button>
    </div>
  );
}
