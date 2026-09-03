import { FileText } from "lucide-react";

export default function CmsHomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
      <FileText className="h-10 w-10" />
      <p className="text-sm">Select a page from the content tree to begin editing.</p>
    </div>
  );
}
