export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CONTENT_ADMIN: "CONTENT_ADMIN",
  MEMBER: "MEMBER",
  READ_ONLY: "READ_ONLY",
  VISITOR: "VISITOR",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  CONTENT_ADMIN: "Content Admin",
  MEMBER: "Member",
  READ_ONLY: "Read Only",
  VISITOR: "Visitor",
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
  | "members.manage"
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
  "members.manage",
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
    "members.manage",
    "audit.view",
  ],
  MEMBER: ["pages.edit", "pages.clone", "media.upload"],
  READ_ONLY: [],
  VISITOR: [],
};

export function hasCapability(role: RoleKey, capability: Capability): boolean {
  return CAPABILITY_MATRIX[role]?.includes(capability) ?? false;
}

export function isAdmin(role: RoleKey): boolean {
  return role === ROLE_KEYS.SUPER_ADMIN || role === ROLE_KEYS.CONTENT_ADMIN;
}

/**
 * Only staff change the live site. Members propose edits through the Member
 * Portal (a ChangeRequest) and a team member approves them.
 */
export function canEditLive(role: RoleKey): boolean {
  return isAdmin(role);
}

/** Admins can touch anything; read-only can view; members never edit live pages directly. */
export function canAccessPage(
  role: RoleKey,
  userId: string,
  page: { assignedMemberId?: string | null },
): boolean {
  if (isAdmin(role)) return true;
  if (role === ROLE_KEYS.READ_ONLY) return true;
  void userId;
  void page;
  return false;
}
