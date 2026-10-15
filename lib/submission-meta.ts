// Constants shared by the portal's submission form (client) and the server.

export const LISTING_SECTIONS: { key: string; label: string; parentSlug: string }[] = [
  { key: "stay", label: "Places to stay", parentSlug: "places-to-stay" },
  { key: "do", label: "Things to do", parentSlug: "things-to-do" },
  { key: "food", label: "Food and drink", parentSlug: "things-to-do/food-drink-more" },
];
