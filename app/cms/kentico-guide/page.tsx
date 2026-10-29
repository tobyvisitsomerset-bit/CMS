import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PrintButton } from "../widgets/guide/print-button";

export const dynamic = "force-dynamic";

// A one-page "coming from Kentico 11" guide for training. Print it or save it
// as a PDF from the browser.
const ROWS: { kentico: string; here: string; note: string }[] = [
  { kentico: "Pages application, content tree on the left", here: "Pages (the home screen), same tree", note: "Same toolbar: new, delete, copy, move up and down, search. New page asks Page (menu item) or Folder first." },
  { kentico: "Edit / Preview / Listing", here: "Edit / Preview / Listing", note: "Listing shows the pages under the selected page as a table with filters, show all levels and bulk Publish, Unpublish, Archive and Delete." },
  { kentico: "Page / Design / Form / Master page / Properties tabs", here: "The same five tabs", note: "Page is the on-page view, Design builds with widgets, Form holds the page's details, Master page is the header and footer for the whole site." },
  { kentico: "Form: Page name, Title, Subtitle, Summary, Menu group, Icon", here: "Form: the same boxes, minus Icon", note: "Put *asterisks* round words in Title to use the script font (Kentico used italics). There is no Icon box because our menus do not show icons." },
  { kentico: "Menu group (Main menu, footer...)", here: "Menu group on the Form tab, or Properties > Navigation", note: "Adds the page to the website's main menu, top menu or footer links. The order of links is set on the Master page tab." },
  { kentico: "Image with focus point and device crops", here: "Focus point under Image", note: "Click or drag on the photo; the previews show phone, tablet, laptop and desktop crops. The home page's rotating photos each have their own focus point." },
  { kentico: "Image 1-4 link, label (member name) and logo", here: "Rotating photos on the home page's Form tab", note: "Add as many photos as you like. Each can credit a member, with a logo and a website link." },
  { kentico: "Business, attraction and event pages", here: "The listing form on the Form tab", note: "Address, contact, opening times, rooms, offers and so on. Member businesses edit their own details in the member portal and you approve the changes." },
  { kentico: "Properties: General, URLs, Template, Metadata, Security, Attachments", here: "The same, plus Workflow and Versions", note: "Template shows what the page uses and Change template is on the Page tab." },
  { kentico: "Properties: Categories, Navigation, Related pages, Linked pages", here: "The same four", note: "Related pages show as You might also like under the page on the website. Linked pages put one page in more than one place in the tree." },
  { kentico: "Pending pages / workflow", here: "Pending pages in the top-bar menu", note: "Members' changes, new listings, events, offers and news arrive here to approve or send back with a reason." },
  { kentico: "Media libraries (Visit Somerset, Visit Taunton, Visit Minehead, Carnival, Paranormal)", here: "Media libraries with the same five names as folders", note: "Upload by dragging. The Used by view shows which pages use a photo." },
  { kentico: "Forms application (enquiries)", here: "Forms (enquiries and signups) in the top-bar menu", note: "Stay enquiries and newsletter signups, with a CSV download." },
  { kentico: "Users and Roles", here: "Users in the top-bar menu", note: "Staff roles: Super admin, Content admin, Read only. Members and visitors have their own sign-in and see only their portal or account." },
  { kentico: "Recycle bin", here: "Archive, then Restore", note: "Archived pages show a red cross in the tree and disappear from the website. Restore puts them back as a draft." },
  { kentico: "Web parts and widgets", here: "Widgets in the Design tab", note: "The Editor's widget guide lists every widget, grouped the same way." },
];

export default async function KenticoGuidePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-500">Use Print and choose &ldquo;Save as PDF&rdquo; to share this with the team.</p>
        <PrintButton />
      </div>
      <h1 className="font-serif text-3xl font-black text-neutral-900">Coming from Kentico 11: what is the same and what is different</h1>
      <p className="mt-3 text-neutral-700">
        This content hub works the way Kentico 11 does, with Visit Somerset&apos;s own look. If you know where something was in Kentico, this
        shows where to find it here.
      </p>
      <table className="mt-6 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[#e5e5e5]">
            <th className="border px-3 py-2">In Kentico 11</th>
            <th className="border px-3 py-2">Here</th>
            <th className="border px-3 py-2">What to know</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.kentico} className="align-top">
              <td className="border px-3 py-2 font-medium">{r.kentico}</td>
              <td className="border px-3 py-2">{r.here}</td>
              <td className="border px-3 py-2 text-neutral-700">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
