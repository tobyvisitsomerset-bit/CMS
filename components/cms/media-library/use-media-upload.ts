"use client";

import { useState } from "react";
import { toast } from "sonner";

export function useMediaUpload(onUploaded: () => void) {
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: FileList | File[], folderId: string | null) {
    setUploading(true);
    try {
      let successCount = 0;
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        if (res.ok) successCount++;
      }
      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
        onUploaded();
      }
      if (successCount < files.length) {
        toast.error(`${files.length - successCount} upload(s) failed`);
      }
    } finally {
      setUploading(false);
    }
  }

  return { uploading, uploadFiles };
}
