import { FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getDashboardStats } from "@/lib/data/dashboard";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-amber-200 bg-amber-50" : "bg-white"}`}>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export default async function CmsHomePage() {
  const session = await auth();
  const roleKey = session?.user.roleKey;

  if (!roleKey || !isAdmin(roleKey)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
        <FileText className="h-10 w-10" />
        <p className="text-sm">Select a page from the content tree to begin editing.</p>
      </div>
    );
  }

  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-lg font-semibold text-neutral-800">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total pages" value={stats.totalPages} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Drafts" value={stats.draft} />
        <StatCard label="Member accounts" value={stats.totalMembers} />
        <StatCard label="Waiting on approval" value={stats.pendingApproval} accent={stats.pendingApproval > 0} />
        <StatCard label="Expiring within 30 days" value={stats.expiringSoon} accent={stats.expiringSoon > 0} />
        <StatCard label="Media files" value={stats.mediaCount} />
        <StatCard label="Media storage used" value={formatBytes(stats.mediaStorageBytes)} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Recent activity</h2>
        <div className="divide-y rounded-lg border bg-white">
          {stats.recentActivity.length === 0 && <p className="p-4 text-sm text-neutral-400">No activity yet.</p>}
          {stats.recentActivity.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-neutral-700">
                <span className="font-medium">{entry.user?.name ?? "Someone"}</span> {entry.action}
                {entry.page ? ` "${entry.page.title}"` : ""}
                {entry.details ? ` — ${entry.details}` : ""}
              </span>
              <span className="shrink-0 text-xs text-neutral-400">
                {new Date(entry.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
