"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignPageMemberAction, createMemberAction } from "@/app/cms/actions";
import type { getPageById } from "@/lib/data/pages";
import type { listMembers } from "@/lib/data/users";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type Member = Awaited<ReturnType<typeof listMembers>>[number];

const UNASSIGNED = "unassigned";

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

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-sm text-neutral-600">
        <h2 className="mb-2 font-semibold text-neutral-800">Ownership</h2>
        <p>
          Assigned member: <span className="font-medium">{page.assignedMember?.name ?? "None"}</span>
        </p>
        <p className="mt-1 text-neutral-500">Author: {page.author?.name ?? "Unknown"}</p>
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h2 className="mb-1 font-semibold text-neutral-800">Ownership</h2>
        <p className="text-sm text-neutral-500">Author: {page.author?.name ?? "Unknown"}</p>
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
    </div>
  );
}
