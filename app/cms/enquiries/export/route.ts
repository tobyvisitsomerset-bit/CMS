import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | null | undefined): string {
  const v = value ?? "";
  // Defuse spreadsheet formula injection from visitor-supplied text.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Staff-only CSV export of stay enquiries / newsletter subscribers.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !hasCapability(session.user.roleKey, "workflow.review")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const kind = new URL(request.url).searchParams.get("kind");

  let csv: string;
  let filename: string;
  if (kind === "subscribers") {
    const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
    csv = ["email,source,joined", ...rows.map((r) => [csvCell(r.email), csvCell(r.source), csvCell(r.createdAt.toISOString())].join(","))].join("\n");
    filename = "newsletter-subscribers.csv";
  } else {
    const rows = await prisma.bookingRequest.findMany({ orderBy: { createdAt: "desc" } });
    csv = [
      "received,listing,listing_url,name,email,phone,check_in,check_out,guests,message",
      ...rows.map((r) =>
        [
          csvCell(r.createdAt.toISOString()),
          csvCell(r.pageTitle),
          csvCell(`/${r.pageSlug}`),
          csvCell(r.name),
          csvCell(r.email),
          csvCell(r.phone),
          csvCell(r.checkIn),
          csvCell(r.checkOut),
          csvCell(r.guests),
          csvCell(r.message),
        ].join(","),
      ),
    ].join("\n");
    filename = "stay-enquiries.csv";
  }

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
