import { redirect } from "next/navigation";

// Photos is now a tab inside each listing's Edit screen.
export default function PhotosPage() {
  redirect("/portal");
}
