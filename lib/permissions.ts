export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CONTENT_ADMIN: "CONTENT_ADMIN",
  MEMBER: "MEMBER",
  READ_ONLY: "READ_ONLY",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  CONTENT_ADMIN: "Content Admin",
  MEMBER: "Member",
  READ_ONLY: "Read Only",
};

export type Capability =
  | "pages.viewAll"
  | "pages.create"
  | "pages.edit"
  | "pages.delete"
  | "pages.publish"
  | "pages.archive"
  | "pages.clone"
  | "pages.reorder"
  | "media.upload"
  | "media.delete"
  | "workflow.review"
  | "settings.manage"
  | "audit.view";

const ALL_CAPABILITIES: Capability[] = [
  "pages.viewAll",
  "pages.create",
  "pages.edit",
  "pages.delete",
  "pages.publish",
  "pages.archive",
  "pages.clone",
  "pages.reorder",
  "media.upload",
  "media.delete",
  "workflow.review",
  "settings.manage",
  "audit.view",
];

const CAPABILITY_MATRIX: Record<RoleKey, Capability[]> = {
  SUPER_ADMIN: ALL_CAPABILITIES,
  CONTENT_ADMIN: [
    "pages.viewAll",
    "pages.create",
    "pages.edit",
    "pages.delete",
    "pages.publish",
    "pages.archive",
    "pages.clone",
    "pages.reorder",
    "media.upload",
    "media.delete",
    "workflow.review",
    "audit.view",
  ],
  MEMBER: ["pages.edit", "pages.clone", "media.upload"],
  READ_ONLY: [],
};

export function hasCapability(role: RoleKey, capability: Capability): boolean {
  return CAPABILITY_MATRIX[role]?.includes(capability) ?? false;
}

export function isAdmin(role: RoleKey): boolean {
  return role === ROLE_KEYS.SUPER_ADMIN || role === ROLE_KEYS.CONTENT_ADMIN;
}

/** Members can only touch pages assigned to them; admins can touch anything; read-only never. */
export function canAccessPage(
  role: RoleKey,
  userId: string,
  page: { assignedMemberId?: string | null },
): boolean {
  if (isAdmin(role)) return true;
  if (role === ROLE_KEYS.MEMBER) return page.assignedMemberId === userId;
  return false;
}
