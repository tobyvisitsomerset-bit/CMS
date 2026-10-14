import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { kindFromMimeType } from "@/lib/data/media";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 15 * 1024 * 1024; // 15MB, dev-only guard

// Files are served from the site's own origin, so anything the browser would
// execute (html, svg, js) must never be accepted. Members may add photos only.
const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
const STAFF_EXT = [...IMAGE_EXT, "pdf", "mp4", "webm", "mov", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "zip"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasCapability(session.user.roleKey, "media.upload")) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folderId = (formData.get("folderId") as string | null) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (15MB limit in dev)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = session.user.roleKey === "MEMBER" ? IMAGE_EXT : STAFF_EXT;
  if (!allowed.includes(ext)) {
    return NextResponse.json(
      { error: session.user.roleKey === "MEMBER" ? "Please upload a photo (JPG, PNG, GIF or WebP)." : "That file type is not allowed." },
      { status: 400 },
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storedName = `${Date.now().toString(36)}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  const media = await prisma.media.create({
    data: {
      filename: file.name,
      url: `/uploads/${storedName}`,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      kind: kindFromMimeType(file.type || ""),
      folderId,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({ media });
}
