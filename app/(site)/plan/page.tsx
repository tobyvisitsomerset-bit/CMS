import type { Metadata } from "next";
import { ItineraryBuilder } from "@/components/plan/itinerary-builder";

export const metadata: Metadata = {
  title: "Build My Somerset Itinerary",
  description: "Answer a few questions and get a day-by-day Somerset plan built from real places to stay, things to do, food and events.",
};

export default function PlanPage() {
  return <ItineraryBuilder />;
}
