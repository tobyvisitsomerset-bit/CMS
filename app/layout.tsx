import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Caveat, Atkinson_Hyperlegible } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { DISPLAY_INLINE_SCRIPT } from "@/lib/display-prefs";
import "./globals.css";
import "./display-settings.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif for consumer-facing listing pages — Geist Sans
// alone reads as pure admin-tool chrome, not a tourism brand.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

// The hand-lettered script used for emphasis words in page titles, as on the
// Visit Somerset logo.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// The "Easy-read font" option on the Accessibility page. Only downloaded by a
// browser that switches that option on.
const easyRead = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Visit Somerset Content Hub",
  description: "Content administration for Visit Somerset",
};

// Colour-blind help filters (see the Accessibility page). Each matrix moves the
// colours a person cannot tell apart onto ones they can, and leaves white and
// greys alone. Worked out from the Machado et al. (2009) simulation matrices.
const COLOUR_FILTERS = [
  { id: "vs-cb-protan", values: "1 0 0 0 0  0.4789 0.4769 0.0442 0 0  0.5973 -0.6887 1.0914 0 0  0 0 0 1 0" },
  { id: "vs-cb-deutan", values: "1 0 0 0 0  0.1628 0.725 0.1122 0 0  0.4547 -0.6454 1.1907 0 0  0 0 0 1 0" },
  { id: "vs-cb-tritan", values: "0.7412 -0.4072 0.666 0 0  0.0751 0.5852 0.3397 0 0  0 0 1 0 0  0 0 0 1 0" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${caveat.variable} ${easyRead.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_INLINE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            {COLOUR_FILTERS.map((f) => (
              <filter key={f.id} id={f.id}>
                <feColorMatrix type="matrix" values={f.values} />
              </filter>
            ))}
          </defs>
        </svg>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
