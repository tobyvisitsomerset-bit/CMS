"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-somerset-green px-3 py-2 text-sm font-medium text-white hover:opacity-90"
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}
