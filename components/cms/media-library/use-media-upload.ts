"use client";

import { useState } from "react";
import { toast } from "sonner";

// Uploads files to the media library and resolves with the URLs of the ones
// that went through, so a caller can drop them straight into a form field.
export function useMediaUpload(onUploaded: () => void = () => {}) {
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | File[], folderId: string | null = null): Promise<string[]> {
    setUploading(true);
    const urls: string[] = [];
    try {
      const list = Array.from(files);
      let failed = 0;
      let lastError = "";
      for (const file of list) {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);
        try {
          const res = await fetch("/api/media/upload", { method: "POST", body: formData });
          const body = (await res.json().catch(() => ({}))) as { media?: { url: string }; error?: string };
          if (res.ok && body.media?.url) urls.push(body.media.url);
          else {
            failed++;
            lastError = body.error ?? "";
          }
        } catch {
          failed++;
        }
      }
      if (urls.length > 0) {
        toast.success(`Uploaded ${urls.length} file${urls.length > 1 ? "s" : ""}`);
        onUploaded();
      }
      if (failed > 0) toast.error(lastError || `${failed} upload${failed > 1 ? "s" : ""} failed`);
    } finally {
      setUploading(false);
    }
    return urls;
  }

  return { uploading, uploadFiles };
}
