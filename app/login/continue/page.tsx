import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// One sign-in for everyone: members land in the Member Portal, staff in the Content Hub.
export default async function ContinuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.roleKey;
  redirect(role === "MEMBER" ? "/portal" : role === "VISITOR" ? "/account" : "/cms");
}
