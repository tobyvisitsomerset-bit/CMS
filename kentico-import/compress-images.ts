// One-off: the migrated Kentico images (real photos pulled from the export)
// are full-resolution originals (many needlessly saved as PNG) averaging
// ~2MB each, totalling ~5GB — far too large to commit to git or serve as-is.
// Downsize to sane web dimensions and re-encode everything as JPEG. Renames
// get written to a map so a follow-up DB pass can fix up stored URLs.
import { readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from "fs";
import path from "path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "uploads", "kentico");
const MAX_WIDTH = 1100;
const JPEG_QUALITY = 62;
const RENAME_MAP_OUT = path.join(process.cwd(), "kentico-import", "image-rename-map.json");

async function main() {
  const files = readdirSync(DIR);
  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  let failed = 0;
  const renameMap: Record<string, string> = {};

  for (const file of files) {
    const fullPath = path.join(DIR, file);
    const before = statSync(fullPath).size;
    totalBefore += before;
    const ext = path.extname(file).toLowerCase();

    if (ext === ".gif") {
      // leave animated gifs untouched — sharp would flatten to a still frame
      totalAfter += before;
      processed++;
      continue;
    }

    try {
      const buffer = readFileSync(fullPath);
      const output = await sharp(buffer)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .flatten({ background: "#ffffff" }) // drop alpha before JPEG encode
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();

      const newName = file.slice(0, -ext.length) + ".jpg";
      const newPath = path.join(DIR, newName);
      writeFileSync(newPath, output);
      if (newPath !== fullPath) unlinkSync(fullPath);
      if (newName !== file) renameMap[`/uploads/kentico/${file}`] = `/uploads/kentico/${newName}`;

      totalAfter += output.length;
      processed++;
    } catch (err) {
      failed++;
      totalAfter += before;
      console.warn(`Failed to compress ${file}: ${(err as Error).message}`);
    }
  }

  writeFileSync(RENAME_MAP_OUT, JSON.stringify(renameMap, null, 2));
  console.log(`\nProcessed ${processed} files (${failed} failed, left as-is).`);
  console.log(`Renamed ${Object.keys(renameMap).length} files (map written to ${RENAME_MAP_OUT}).`);
  console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(0)}MB`);
  console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(0)}MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
