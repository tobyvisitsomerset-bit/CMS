import { redirect } from "next/navigation";

// News now lives on the Events & news screen.
export default function NewsPage() {
  redirect("/portal/events");
}
