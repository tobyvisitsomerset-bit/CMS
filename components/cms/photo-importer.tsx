"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { photoBatchAction, retryFailedPhotosAction } from "@/app/cms/import-photos/actions";
import type { PhotoImportProgress } from "@/lib/photo-import";

export function PhotoImporter({ initial }: { initial: PhotoImportProgress }) {
  const [progress, setProgress] = useState(initial);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const stop = useRef(false);

  async function run() {
    stop.current = false;
    setRunning(true);
    setMessage(null);
    try {
      let last = progress;
      while (!stop.current) {
        last = await photoBatchAction();
        setProgress(last);
        if (last.stoppedBecause) {
          setMessage(last.stoppedBecause);
          break;
        }
        if (last.remaining === 0) {
          setMessage("All done.");
          break;
        }
      }
    } catch {
      setMessage("Something interrupted the import. Press Start to carry on from where it stopped.");
    } finally {
      setRunning(false);
    }
  }

  async function retry() {
    setProgress(await retryFailedPhotosAction());
    setMessage("The pages it gave up on will be tried again.");
  }

  const stat = "rounded-lg border bg-white p-4";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className={stat}>
          <p className="text-2xl font-semibold">{progress.withPhotoNow.toLocaleString("en-GB")}</p>
          <p className="text-xs text-neutral-500">published pages with a photo</p>
        </div>
        <div className={stat}>
          <p className="text-2xl font-semibold">{progress.remaining.toLocaleString("en-GB")}</p>
          <p className="text-xs text-neutral-500">pages still to do</p>
        </div>
        <div className={stat}>
          <p className="text-2xl font-semibold">{progress.recovered.toLocaleString("en-GB")}</p>
          <p className="text-xs text-neutral-500">photos recovered so far</p>
        </div>
        <div className={stat}>
          <p className="text-2xl font-semibold">{progress.gaveUp.toLocaleString("en-GB")}</p>
          <p className="text-xs text-neutral-500">pages with no photo to find</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Button variant="outline" onClick={() => (stop.current = true)}>
            Pause
          </Button>
        ) : (
          <Button onClick={run} disabled={progress.remaining === 0}>
            {progress.remaining === 0 ? "Nothing left to do" : "Start"}
          </Button>
        )}
        {progress.gaveUp > 0 && !running && (
          <Button variant="ghost" onClick={retry}>
            Try the {progress.gaveUp} it gave up on again
          </Button>
        )}
        {running && <span className="text-sm text-neutral-500">Working - keep this page open. You can pause and carry on later.</span>}
      </div>
      {message && <p className="rounded-md bg-neutral-50 p-3 text-sm">{message}</p>}
    </div>
  );
}
