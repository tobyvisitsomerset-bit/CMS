import { readFileSync } from "fs";

/**
 * Kentico's `.xml.export` files are a flat `<Root><NewDataSet><RowTag>...</RowTag>...</NewDataSet></Root>`
 * shape — one element per row, with scalar field values as child elements. Good enough
 * to parse with a couple of regexes rather than pulling in a full XML parser.
 */
export function parseExportRows(filePath: string, rowTag: string): Record<string, string>[] {
  const xml = readFileSync(filePath, "utf-8");
  const rowRegex = new RegExp(`<${rowTag}>([\\s\\S]*?)</${rowTag}>`, "g");
  const fieldRegex = /<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g;

  const rows: Record<string, string>[] = [];
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml))) {
    const body = rowMatch[1];
    const row: Record<string, string> = {};
    let fieldMatch: RegExpExecArray | null;
    fieldRegex.lastIndex = 0;
    while ((fieldMatch = fieldRegex.exec(body))) {
      row[fieldMatch[1]] = unescapeXml(fieldMatch[2]);
    }
    rows.push(row);
  }
  return rows;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
