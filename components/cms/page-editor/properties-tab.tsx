"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignPageMemberAction, createMemberAction, saveContentAction } from "@/app/cms/actions";
import type { getPageById } from "@/lib/data/pages";
import type { listMembers } from "@/lib/data/users";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type Member = Awaited<ReturnType<typeof listMembers>>[number];

const UNASSIGNED = "unassigned";

const VISIBILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "member-only", label: "Member only" },
  { value: "internal", label: "Internal" },
];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PropertiesTab({
  page,
  members,
  canManage,
}: {
  page: PageDetail;
  members: Member[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memberList, setMemberList] = useState(members);
  const [selected, setSelected] = useState(page.assignedMemberId ?? UNASSIGNED);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visibility, setVisibility] = useState(page.visibility);
  const [assignedTeam, setAssignedTeam] = useState(page.assignedTeam ?? "");

  const metadata = (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Author</p>
        <p className="text-neutral-700">{page.author?.name ?? "Unknown"}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Owner</p>
        <p className="text-neutral-700">{page.owner?.name ?? "Unknown"}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Created</p>
        <p className="text-neutral-700">{formatDate(page.createdAt)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Last modified</p>
        <p className="text-neutral-700">{formatDate(page.updatedAt)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Status</p>
        <p className="text-neutral-700">{page.status}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-400">Assigned member</p>
        <p className="text-neutral-700">{page.assignedMember?.name ?? "None"}</p>
      </div>
    </div>
  );

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h2 className="mb-3 font-semibold text-neutral-800">Ownership</h2>
          {metadata}
        </div>
      </div>
    );
  }

  function handleAssign(value: string | null) {
    if (!value) return;
    setSelected(value);
    startTransition(async () => {
      try {
        await assignPageMemberAction(page.id, value === UNASSIGNED ? null : value);
        toast.success(value === UNASSIGNED ? "Member unassigned" : "Member assigned");
        router.refresh();
      } catch {
        toast.error("Couldn't update the assignment — check your permissions.");
      }
    });
  }

  function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const member = await createMemberAction({ name, email, password });
        setMemberList((prev) => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)));
        setSelected(member.id);
        await assignPageMemberAction(page.id, member.id);
        toast.success(`Created ${member.name} and assigned this page`);
        setCreateOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't create the member account.");
      }
    });
  }

  function handleVisibility(value: string | null) {
    if (!value) return;
    setVisibility(value);
    startTransition(async () => {
      try {
        await saveContentAction(page.id, { visibility: value });
        toast.success("Visibility updated");
        router.refresh();
      } catch {
        toast.error("Couldn't update visibility.");
      }
    });
  }

  function handleTeamBlur() {
    if (assignedTeam === (page.assignedTeam ?? "")) return;
    startTransition(async () => {
      try {
        await saveContentAction(page.id, { assignedTeam: assignedTeam || null });
        toast.success("Assigned team updated");
        router.refresh();
      } catch {
        toast.error("Couldn't update the assigned team.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h2 className="mb-3 font-semibold text-neutral-800">Ownership</h2>
        {metadata}
      </div>

      <div className="space-y-1.5">
        <Label>Assigned member</Label>
        <Select value={selected} onValueChange={handleAssign} disabled={pending}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Not assigned</SelectItem>
            {memberList.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} ({m.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-500">
          The assigned member can log into the member portal and manage this page.
        </p>
      </div>

      {!createOpen ? (
        <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
          Create new member account
        </Button>
      ) : (
        <form onSubmit={handleCreateMember} className="space-y-3 rounded-md border p-4">
          <p className="text-sm font-medium text-neutral-700">New member account</p>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Initial password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a temporary password — share it with them directly"
              required
              minLength={8}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create and assign"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        <Label>Visibility</Label>
        <Select value={visibility} onValueChange={handleVisibility} disabled={pending}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Assigned team</Label>
        <Input
          value={assignedTeam}
          onChange={(e) => setAssignedTeam(e.target.value)}
          onBlur={handleTeamBlur}
          placeholder="e.g. Content Team, Places to Stay"
        />
      </div>
    </div>
  );
}
