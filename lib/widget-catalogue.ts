// The widget catalogue — the single source of truth for what each Design-tab
// widget is, when to use it and what its properties mean. It feeds three
// things: the "Add widget" gallery in the editor, the Widgets application
// (/cms/widgets) and the exportable training guide for the editing teams.
//
// Terminology follows Kentico 11 (which the team already knows): a page is
// built in the Design tab from *widgets* placed in a *zone*; each widget has
// *properties* edited in a dialog.

import type { BlockType } from "@/components/cms/page-builder/block-types";

export type WidgetCategory = "Content panels" | "Page structure" | "Content" | "Real-data widgets" | "Shop & booking" | "Legacy";

export type WidgetProperty = {
  name: string;
  type: "Text" | "Long text" | "Image" | "URL" | "Number" | "Yes/No" | "Choice" | "List";
  help: string;
};

export type WidgetDef = {
  type: BlockType;
  name: string;
  category: WidgetCategory;
  summary: string;
  whenToUse: string;
  /** Where its content comes from. */
  data: "You type it" | "Live data from the site";
  /** Short, plain-English description of the live data, if any. */
  dataNote?: string;
  properties: WidgetProperty[];
  tips: string[];
  /** Hidden from the Add-widget gallery (kept so existing pages still render). */
  legacy?: boolean;
  /** The Kentico 11 widget(s) editors already know that this replaces. */
  kentico?: string;
};

export const WIDGET_CATEGORIES: { name: WidgetCategory; blurb: string }[] = [
  { name: "Content panels", blurb: "The \"Content panel – …\" family: one widget, many layouts." },
  { name: "Page structure", blurb: "Banners and calls to action that frame a page." },
  { name: "Content", blurb: "Words, pictures, video and questions that you write yourself." },
  { name: "Real-data widgets", blurb: "These fill themselves from the live site — you only choose what to show." },
  { name: "Shop & booking", blurb: "Buy Somerset and Book Experiences landing sections." },
  { name: "Legacy", blurb: "Older widgets kept so existing pages keep working. Don't add these to new pages." },
];

export const WIDGETS: WidgetDef[] = [
  {
    type: "content_panel",
    name: "Content panel",
    category: "Content panels",
    summary:
      "A flexible panel of words, pictures, video or cards. Pick a layout: Text only, Text & image, Image & text, Text & image split, Image & text split, Video & text, Text & cards, Feature cards, Highlight cards, Simple header with grid, or Carousel.",
    whenToUse: "Almost any editorial block on a landing page. Add one per section of the page and choose the layout that fits.",
    data: "You type it",
    kentico: "Content panel – Text only / Text & image / Image & text / Text & image split / Image & text split / Video & text / Text & cards / Feature cards / Highlight cards / Simple header w/ grid / Carousel",
    properties: [
      { name: "Layout", type: "Choice", help: "Which Content panel layout to use (same names as the Kentico widgets)." },
      { name: "Background", type: "Choice", help: "White, light grey, Somerset green or damson purple." },
      { name: "Eyebrow / Heading / Text", type: "Text", help: "The words. Leave a blank line between paragraphs." },
      { name: "Image + description", type: "Image", help: "Used by the image and split layouts. Add a description for screen readers." },
      { name: "Video URL", type: "URL", help: "YouTube or Vimeo link for Video & text." },
      { name: "Button label / link", type: "Text", help: "Optional button under the text." },
      { name: "Cards", type: "List", help: "For the card and carousel layouts: title, text, link and image for each card." },
    ],
    tips: ["Alternate white and grey backgrounds down a page to give it rhythm.", "Keep card text short — two lines at most."],
  },
  {
    type: "button",
    name: "Button",
    category: "Content panels",
    summary: "A single call-to-action button.",
    whenToUse: "Under a paragraph when you need one clear next step.",
    data: "You type it",
    kentico: "Button",
    properties: [
      { name: "Label", type: "Text", help: "What the button says." },
      { name: "Link", type: "URL", help: "A site page (/places-to-stay) or full web address." },
      { name: "Style / Alignment", type: "Choice", help: "Purple for booking actions, green or outline otherwise." },
    ],
    tips: [],
  },
  {
    type: "spotlight",
    name: "Spotlight",
    category: "Content panels",
    summary: "A large rounded image panel with a headline, a sentence and a button over it.",
    whenToUse: "To promote one thing: an event, an offer or a campaign.",
    data: "You type it",
    kentico: "Spotlight",
    properties: [
      { name: "Eyebrow / Heading / Text", type: "Text", help: "The words over the image." },
      { name: "Background image", type: "Image", help: "Wide landscape photo." },
      { name: "Button label / link", type: "Text", help: "Optional button." },
    ],
    tips: [],
  },
  {
    type: "newsletter_bar",
    name: "Newsletter signup bar",
    category: "Content panels",
    summary: "A green strip with an email signup box. Signups are stored under Enquiries.",
    whenToUse: "Under a page's main content, or on a campaign page.",
    data: "You type it",
    kentico: "Newsletter signup bar",
    properties: [{ name: "Heading / Text", type: "Text", help: "The words beside the signup box." }],
    tips: ["The footer already has a newsletter signup — don't add this on the same screen as the footer."],
  },
  {
    type: "ad_bar",
    name: "Ad bar",
    category: "Content panels",
    summary: "A wide banner image that links out, labelled as an advertisement.",
    whenToUse: "A sponsor or partner banner.",
    data: "You type it",
    kentico: "Ad bar",
    properties: [
      { name: "Banner image", type: "Image", help: "Wide, short image." },
      { name: "Link", type: "URL", help: "Where it goes (opens in a new tab)." },
      { name: "Description", type: "Text", help: "For screen readers." },
    ],
    tips: [],
  },
  {
    type: "contact_form",
    name: "Contact form",
    category: "Content panels",
    summary: "A simple name / email / message form. Messages are stored under Enquiries against the page.",
    whenToUse: "Contact pages and campaign pages.",
    data: "You type it",
    kentico: "Contact Form General",
    properties: [{ name: "Heading / Introduction", type: "Text", help: "The words above the form." }],
    tips: ["Messages are not emailed — someone needs to check Enquiries."],
  },
  {
    type: "page_cards",
    name: "You might like",
    category: "Real-data widgets",
    summary: "Cards linking to real pages you choose, each showing the page's own title, picture and summary.",
    whenToUse: "At the end of an article or listing to suggest what to read or visit next.",
    data: "Live data from the site",
    dataNote: "Each card is read from the page you point to, so titles and photos stay in step with that page.",
    kentico: "You might like",
    properties: [
      { name: "Heading", type: "Text", help: "Default: You might like." },
      { name: "Pages", type: "List", help: "Each page's slug (from Properties › URLs). Cards appear in this order." },
    ],
    tips: [],
  },
  {
    type: "hero",
    name: "Hero banner",
    category: "Page structure",
    summary: "A large banner at the top of a page with a heading, a line of text and an optional button. On the home page it can also show the search panel.",
    whenToUse: "First widget on a landing page or section page.",
    data: "You type it",
    kentico: "Spotlight (hero) / Availability search (when the search bar is on)",
    properties: [
      { name: "Eyebrow", type: "Text", help: "Small capitals line above the heading, e.g. SOMERSET · ENGLAND'S WEST COUNTRY." },
      { name: "Heading", type: "Text", help: "The big headline. Keep it short." },
      { name: "Subheading", type: "Long text", help: "One or two sentences under the heading." },
      { name: "Background image", type: "Image", help: "Pick from the Media library. Leave blank for the green gradient." },
      { name: "CTA label / CTA URL", type: "Text", help: "Optional button text and where it goes (e.g. /places-to-stay)." },
      { name: "Show the homepage search bar", type: "Yes/No", help: "Turns on the Stay / Things to do / Eat & drink / What's on search panel. Use on the home page only." },
    ],
    tips: ["Use a wide landscape photo, at least 1600px across.", "Only one hero per page."],
  },
  {
    type: "book_strip",
    name: "Book strip",
    category: "Page structure",
    summary: "The grey \"Ready to book?\" strip of purple buttons that sits under the home page hero.",
    whenToUse: "Directly under a hero when you want two or three clear booking calls to action.",
    data: "You type it",
    properties: [
      { name: "Lead-in text", type: "Text", help: "The words before the buttons, e.g. Ready to book?" },
      { name: "Buttons", type: "List", help: "Each button has a label and a link. Two or three works best." },
      { name: "Text link label / URL", type: "Text", help: "Optional plain link shown after the buttons." },
    ],
    tips: ["Link to real pages only: /book-experiences, /places-to-stay, /festivals-events."],
  },
  {
    type: "cta_banner",
    name: "Call-to-action banner",
    category: "Page structure",
    summary: "A wide rounded banner with a heading, a sentence and a button.",
    whenToUse: "To close a page or point visitors to the next step (e.g. open the map, submit an event).",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "The headline." },
      { name: "Subtext", type: "Long text", help: "A supporting sentence." },
      { name: "Button label / Button URL", type: "Text", help: "What the purple button says and where it goes." },
      { name: "Style", type: "Choice", help: "Dark green or light grey." },
    ],
    tips: ["One clear action per banner."],
  },
  {
    type: "text",
    name: "Text block",
    category: "Content",
    summary: "A heading and a block of copy.",
    whenToUse: "Introductions, explanations and any plain writing on a page.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading." },
      { name: "Body", type: "Long text", help: "Leave a blank line between paragraphs." },
    ],
    tips: ["For long articles, use the page's own Body content field in the Form tab instead."],
  },
  {
    type: "gallery",
    name: "Image gallery",
    category: "Content",
    summary: "A grid of pictures.",
    whenToUse: "Showing several photos of a place or event.",
    data: "You type it",
    properties: [{ name: "Images", type: "List", help: "Pick each image from the Media library." }],
    tips: ["Use images of similar shape so the grid stays tidy."],
  },
  {
    type: "cards",
    name: "Cards",
    category: "Content",
    summary: "A row of cards, each with a picture, a title and a short description.",
    whenToUse: "Highlighting three to six things that you choose by hand.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading above the cards." },
      { name: "Columns", type: "Number", help: "2, 3 or 4 across." },
      { name: "Cards", type: "List", help: "Each card: title, description, image and an optional badge." },
    ],
    tips: ["For things that already have their own page, a real-data widget is better — it stays up to date by itself."],
  },
  {
    type: "video",
    name: "Video",
    category: "Content",
    summary: "An embedded video.",
    whenToUse: "A YouTube or Vimeo film about a place or event.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading." },
      { name: "Video URL", type: "URL", help: "The link to the video." },
    ],
    tips: [],
  },
  {
    type: "accordion",
    name: "Accordion",
    category: "Content",
    summary: "Questions that open to show an answer.",
    whenToUse: "Practical information visitors may want to skim.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading." },
      { name: "Items", type: "List", help: "Each item has a question and an answer." },
    ],
    tips: [],
  },
  {
    type: "faq",
    name: "FAQ",
    category: "Content",
    summary: "Frequently asked questions — works the same as the accordion.",
    whenToUse: "A page of questions and answers.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading." },
      { name: "Items", type: "List", help: "Each item has a question and an answer." },
    ],
    tips: [],
  },
  {
    type: "testimonials",
    name: "Testimonials",
    category: "Content",
    summary: "Quotes from visitors or members, with an optional star rating.",
    whenToUse: "Only with real quotes you have permission to use.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading." },
      { name: "Quotes", type: "List", help: "Each: the quote, who said it, and a 1–5 rating." },
    ],
    tips: ["Never invent quotes or ratings."],
  },
  {
    type: "map",
    name: "Map placeholder",
    category: "Content",
    summary: "A simple location label in a green box. It is not an interactive map.",
    whenToUse: "Rarely. For a real map use the Map band widget.",
    data: "You type it",
    properties: [
      { name: "Heading", type: "Text", help: "Optional heading." },
      { name: "Location label", type: "Text", help: "The place name to show." },
    ],
    tips: ["Prefer the Map band widget."],
  },
  {
    type: "mood_tiles",
    name: "Mood tiles",
    category: "Real-data widgets",
    summary: "Round tiles such as Coast & piers or Cider & cheese. Each tile is a real search and shows how many places match.",
    whenToUse: "On the home page to give visitors an easy way in.",
    data: "Live data from the site",
    dataNote: "The place count is the real number of published places whose name or description contains the search word.",
    properties: [
      { name: "Eyebrow / Title / Subtitle", type: "Text", help: "The words above the tiles." },
      { name: "Moods", type: "List", help: "Each mood has a label (what visitors see) and a search word (what is searched, e.g. cave)." },
    ],
    tips: ["Pick search words that really appear in your content, otherwise the count will be low.", "Six tiles fit best."],
  },
  {
    type: "real_teaser",
    name: "Content teaser (events or places)",
    category: "Real-data widgets",
    summary: "A row of real upcoming events (grey band) or real places to stay (cards), with a 'see all' link.",
    whenToUse: "Home page or a section page to surface what's on or where to stay.",
    data: "Live data from the site",
    dataNote: "Events come from the Festivals & events section, soonest first. Places come from the section you choose, highest membership tier first.",
    properties: [
      { name: "Title / Eyebrow", type: "Text", help: "Heading words. Eyebrow for events defaults to the current month." },
      { name: "Content type", type: "Choice", help: "Real upcoming events, or real businesses." },
      { name: "Root slug", type: "Text", help: "The section to draw from, e.g. festivals-events or places-to-stay." },
      { name: "How many to show", type: "Number", help: "Usually 4 (events) or 3 (places)." },
      { name: "See-all link", type: "URL", help: "Where the 'All events' / 'All places' link goes." },
    ],
    tips: ["Add two of these on the home page, one for each content type."],
  },
  {
    type: "towns_row",
    name: "Towns row",
    category: "Real-data widgets",
    summary: "Tiles for towns and cities, each linking to that town's real page.",
    whenToUse: "Home page or Discover pages.",
    data: "Live data from the site",
    dataNote: "Each tile uses the linked page's own title and picture.",
    properties: [
      { name: "Title", type: "Text", help: "Heading above the tiles." },
      { name: "Towns", type: "List", help: "Each: the name to show and the slug of the real page." },
    ],
    tips: ["Copy a page's slug from its Properties › URLs tab."],
  },
  {
    type: "explore_area_tiles",
    name: "Explore tiles",
    category: "Real-data widgets",
    summary: "Tiles for main sections, each with a live count of the pages inside.",
    whenToUse: "A quick directory of the site's big sections.",
    data: "Live data from the site",
    dataNote: "Counts are the number of published pages under each section — you never type them.",
    properties: [
      { name: "Areas", type: "List", help: "Each: label, section slug, link and the noun used in the count (e.g. places to stay)." },
    ],
    tips: [],
  },
  {
    type: "map_band",
    name: "Map band",
    category: "Real-data widgets",
    summary: "A green band with copy and buttons on the left and a live map of real places on the right.",
    whenToUse: "Near the bottom of the home page to point visitors at the interactive map.",
    data: "Live data from the site",
    dataNote: "The map shows a sample of real places that have a location.",
    properties: [
      { name: "Eyebrow / Heading / Text", type: "Text", help: "The words beside the map." },
      { name: "Primary / Secondary button", type: "Text", help: "Label and link for each button." },
    ],
    tips: [],
  },
  {
    type: "partners_row",
    name: "Partners row",
    category: "Real-data widgets",
    summary: "A row of real featured members (highest membership tier first), e.g. Made in Somerset.",
    whenToUse: "Home page or a section page to celebrate members.",
    data: "Live data from the site",
    kentico: "Business member carousel",
    dataNote: "Members come from the section you choose; their membership tier decides the order.",
    properties: [
      { name: "Eyebrow / Title", type: "Text", help: "Heading words." },
      { name: "Root slug", type: "Text", help: "The section to draw members from." },
      { name: "How many", type: "Number", help: "Usually 6." },
      { name: "See-all label / link", type: "Text", help: "The link at the top right." },
    ],
    tips: [],
  },
  {
    type: "listing_explorer",
    name: "Listing explorer",
    category: "Real-data widgets",
    summary: "The full searchable, filterable list of places or events with a map. This IS the page content on Places to stay, Things to do, Food & drink and Festivals & events.",
    whenToUse: "On a section's landing page. One per page.",
    data: "Live data from the site",
    kentico: "Member listing + Member filter strip",
    dataNote: "Every listing under the section appears automatically. Filters (type, town, graded, bookable, featured) are built from the real listings.",
    properties: [
      { name: "What it lists", type: "Choice", help: "Accommodation (with dates + map), Things to do, Food & drink, or Festivals & events." },
      { name: "Section slug", type: "Text", help: "The section whose listings to show, e.g. places-to-stay." },
      { name: "Page heading / Intro", type: "Text", help: "The big title and an optional sentence." },
      { name: "Noun for counts", type: "Text", help: "e.g. places to stay." },
      { name: "Breadcrumb parent", type: "Text", help: "Optional parent label for the breadcrumb." },
    ],
    tips: ["New listings appear here the moment they are published — nothing to update."],
  },
  {
    type: "producer_shop",
    name: "Producer shop",
    category: "Shop & booking",
    summary: "One block per producer with their description and a scrolling row of their real products and prices, each with a Buy Now link.",
    whenToUse: "The Buy Somerset page.",
    data: "Live data from the site",
    kentico: "Member eCommerce Carousel",
    dataNote: "Products are read from each producer's own online shop, so prices are always theirs. A producer whose shop can't be read shows their description and a link instead.",
    properties: [
      { name: "Section slug", type: "Text", help: "Where the producers live (virtual-highstreet)." },
      { name: "Introduction", type: "Long text", help: "The welcome copy above the producers." },
    ],
    tips: ["To add a producer, add a page under the producers section with its shop details."],
  },
  {
    type: "experiences_hub",
    name: "Experiences hub",
    category: "Shop & booking",
    summary: "The Book Experiences landing: search, real bookable listings that link to each operator's own booking page, live stats and day-type tiles.",
    whenToUse: "The Book Experiences page.",
    data: "Live data from the site",
    kentico: "Availability search + Member listing",
    dataNote: "Any things-to-do listing with an online booking link appears automatically.",
    properties: [
      { name: "Heading", type: "Text", help: "The big title." },
      { name: "Intro", type: "Long text", help: "Leave blank for the automatic sentence with the real count." },
    ],
    tips: ["To make something bookable, add its booking link on the listing's own page (Form tab)."],
  },
  {
    type: "listing_search",
    name: "Listing search bar (legacy)",
    category: "Legacy",
    summary: "Search bar for the old demo listing tables.",
    whenToUse: "Do not use — replaced by the Listing explorer.",
    data: "You type it",
    properties: [],
    tips: [],
    legacy: true,
  },
  {
    type: "listing_grid",
    name: "Listing grid & map (legacy)",
    category: "Legacy",
    summary: "Card grid for the old demo listing tables.",
    whenToUse: "Do not use — replaced by the Listing explorer.",
    data: "You type it",
    properties: [],
    tips: [],
    legacy: true,
  },
  {
    type: "event_calendar",
    name: "Event calendar (legacy)",
    category: "Legacy",
    summary: "Event list for the old demo listing tables.",
    whenToUse: "Do not use — replaced by the Listing explorer (events).",
    data: "You type it",
    properties: [],
    tips: [],
    legacy: true,
  },
];

export function widgetByType(type: string): WidgetDef | undefined {
  return WIDGETS.find((w) => w.type === type);
}

// ---- export formats --------------------------------------------------------

export type WidgetUsage = Record<string, { slug: string; title: string }[]>;

export function widgetGuideMarkdown(usage: WidgetUsage = {}): string {
  const out: string[] = [];
  out.push("# Visit Somerset — editor's widget guide", "");
  out.push(
    "This guide explains how pages are built on the new Visit Somerset site. It uses the same ideas as Kentico 11: you open a page in **Pages**, switch between **Edit / Preview / Listing**, and build the page in the **Design** tab by adding **widgets**.",
    "",
  );
  out.push("## Editing a page in five steps", "");
  out.push(
    "1. Open **Pages** and pick a page in the content tree.",
    "2. In **Edit** mode use the **Form** tab for the page's own details (title, summary, address, prices, opening times).",
    "3. Use the **Design** tab to add, reorder and edit widgets (landing pages are built this way).",
    "4. Click **Save**. Use **Preview** to check how it looks.",
    "5. **Publish** to make it live, or **Submit for review** if you are a member.",
    "",
  );
  for (const cat of WIDGET_CATEGORIES) {
    const items = WIDGETS.filter((w) => w.category === cat.name);
    if (items.length === 0) continue;
    out.push(`## ${cat.name}`, "", cat.blurb, "");
    for (const w of items) {
      out.push(`### ${w.name}`, "", w.summary, "");
      out.push(`- **When to use it:** ${w.whenToUse}`);
      if (w.kentico) out.push(`- **Kentico 11 equivalent:** ${w.kentico}`);
      out.push(`- **Content comes from:** ${w.data}${w.dataNote ? ` — ${w.dataNote}` : ""}`);
      const used = usage[w.type] ?? [];
      out.push(`- **Used on:** ${used.length ? used.map((u) => `${u.title} (/${u.slug})`).join(", ") : "not currently used"}`);
      out.push("");
      if (w.properties.length) {
        out.push("| Property | Type | What it does |", "| --- | --- | --- |");
        for (const p of w.properties) out.push(`| ${p.name} | ${p.type} | ${p.help.replace(/\|/g, "/")} |`);
        out.push("");
      }
      if (w.tips.length) {
        out.push("**Tips**", "");
        for (const t of w.tips) out.push(`- ${t}`);
        out.push("");
      }
    }
  }
  return out.join("\n");
}
