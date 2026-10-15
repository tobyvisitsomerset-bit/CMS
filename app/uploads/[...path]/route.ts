import { readFile } from "fs/promises";
import path from "path";
import { CONTENT_TYPES, UPLOAD_DIR } from "@/lib/uploads";

// Serves files uploaded while the site is running. Next only serves files
// from /public that existed at build time, so uploads need this route. (The
// imported Kentico images under /uploads/kentico are build-time files and are
// served by Next directly; this handler never sees those.)
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  if (parts.some((p) => !p || p === ".." || p.includes("\\") || p.startsWith("."))) {
    return new Response("Not found", { status: 404 });
  }
  const ext = parts[parts.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const type = CONTENT_TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });

  const file = path.resolve(UPLOAD_DIR, ...parts);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
