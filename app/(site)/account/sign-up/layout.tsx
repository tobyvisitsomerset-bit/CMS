import type { Metadata } from "next";

// The page itself is a client component, so its title is set here.
export const metadata: Metadata = { title: "Create your free Visit Somerset account" };

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
