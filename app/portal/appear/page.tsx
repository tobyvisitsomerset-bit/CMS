import { redirect } from "next/navigation";

// Where you appear is now a tab inside each listing's Edit screen.
export default function AppearPage() {
  redirect("/portal");
}
