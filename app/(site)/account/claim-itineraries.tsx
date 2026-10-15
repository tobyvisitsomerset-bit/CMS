"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { claimItinerariesAction } from "./actions";

// Itineraries a visitor saved before they had an account are attached to it
// the first time they open their account.
export function ClaimItineraries() {
  const router = useRouter();
  useEffect(() => {
    let tokens: string[] = [];
    try {
      const raw = localStorage.getItem("vs-itineraries");
      tokens = raw ? (JSON.parse(raw) as { token: string }[]).map((x) => x.token) : [];
    } catch {
      tokens = [];
    }
    if (tokens.length === 0) return;
    void claimItinerariesAction(tokens).then((r) => {
      if (r.claimed > 0) router.refresh();
    });
  }, [router]);
  return null;
}
