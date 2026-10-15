"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPagesAction } from "@/app/cms/actions";
import {
  assignPagesToMemberAction,
  createUserAction,
  resetUserPasswordAction,
  unassignPageAction,
  type CreateUserResult,
} from "@/app/cms/users/actions";

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  pages: { id: string; title: string }[];
  createdAt: string;
};
type Hit = { id: string; title: string; slug: string; status: string };

const ROLE_OPTIONS = [
  { key: "MEMBER", label: "Member (looks after their own page)", staff: false },
  { key: "CONTENT_ADMIN", label: "Content Admin (team: edits and approves)", staff: true },
  { key: "SUPER_ADMIN", label: "Super Admin (team: everything)", staff: true },
  { key: "READ_ONLY", label: "Read only (team: view only)", staff: true },
];

function PagePicker({ chosen, onChange }: { chosen: { id: string; title: string }[]; onChange: (p: { id: string; title: string }[]) => void }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ q: string; hits: Hit[] }>({ q: "", hits: [] });
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const t = setTimeout(() => {
      void searchPagesAction(term).then((rows) => setResult({ q: term, hits: rows as Hit[] }));
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const hits = term.length >= 2 && result.q === term ? result.hits : [];
  return (
    <div className="space-y-2">
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-somerset-green/10 px-2.5 py-1 text-xs font-semibold text-somerset-green">
              {p.title}
              <button type="button" onClick={() => onChange(chosen.filter((c) => c.id !== p.id))} aria-label={`Remove ${p.title}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for their page by name" />
      {hits.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-md border bg-white">
          {hits
            .filter((h) => !chosen.some((c) => c.id === h.id))
            .map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...chosen, { id: h.id, title: h.title }]);
                    setQ("");
                  }}
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <strong>{h.title}</strong>
                  <span className="text-xs text-neutral-500">/{h.slug}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function UsersManager({
  users,
  emailReady,
  isSuperAdmin,
  meId,
}: {
  users: UserRow[];
  emailReady: boolean;
  isSuperAdmin: boolean;
  meId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("MEMBER");
  const [password, setPassword] = useState("");
  const [pages, setPages] = useState<{ id: string; title: string }[]>([]);
  const [sendMail, setSendMail] = useState(true);
  const [created, setCreated] = useState<(CreateUserResult & { ok: true; name: string }) | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addPages, setAddPages] = useState<{ id: string; title: string }[]>([]);

  const roles = ROLE_OPTIONS.filter((r) => !r.staff || isSuperAdmin);

  function create() {
    start(async () => {
      const res = await createUserAction({ name, email, roleKey, password, pageIds: pages.map((p) => p.id), sendEmail: sendMail });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCreated({ ...res, name });
      setName("");
      setEmail("");
      setPassword("");
      setPages([]);
      router.refresh();
    });
  }

  function reset(u: UserRow) {
    start(async () => {
      const res = await resetUserPasswordAction(u.id, sendMail);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCreated({ ...res, name: u.name });
      router.refresh();
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.message(text);
    }
  }

  const emailNote = (e: CreateUserResult & { ok: true }) =>
    e.emailed === "sent"
      ? "A welcome email with their sign-in link has been sent."
      : e.emailed === "not-configured"
        ? "Email is not set up yet, so nothing was sent. Pass these details on yourself."
        : e.emailed === "failed"
          ? "The email could not be sent. Pass these details on yourself."
          : "No email was sent.";

  return (
    <div className="space-y-8">
      {created && (
        <div className="rounded-lg border border-somerset-green/40 bg-somerset-green/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Account ready for {created.name}</p>
              <p className="text-sm text-neutral-600">{emailNote(created)}</p>
            </div>
            <button type="button" onClick={() => setCreated(null)} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-md bg-white p-2">
              <span>
                <span className="text-neutral-500">Email: </span>
                <strong>{created.email}</strong>
              </span>
              <button type="button" onClick={() => copy(created.email)} aria-label="Copy email">
                <Copy className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md bg-white p-2">
              <span>
                <span className="text-neutral-500">Temporary password: </span>
                <strong className="font-mono">{created.password}</strong>
              </span>
              <button type="button" onClick={() => copy(created.password)} aria-label="Copy password">
                <Copy className="size-4" />
              </button>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-500">This password is only shown now. They are asked to change it after signing in.</p>
        </div>
      )}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-semibold">Create an account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email address</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty to generate one" />
          </div>
        </div>

        {roleKey === "MEMBER" && (
          <div className="mt-4 space-y-1.5">
            <Label>Their page or pages</Label>
            <PagePicker chosen={pages} onChange={setPages} />
          </div>
        )}

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} className="mt-1" />
          <span>
            Email them their sign-in details
            {!emailReady && <span className="block text-xs text-amber-700">Email sending is not switched on yet. You will be shown the details to pass on.</span>}
          </span>
        </label>

        <div className="mt-5">
          <Button disabled={pending || !name.trim() || !email.trim()} onClick={create}>
            <Plus className="size-4" /> Create account
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-neutral-500 uppercase">Accounts ({users.length})</h2>
        <div className="divide-y rounded-lg border bg-white">
          {users.map((u) => (
            <div key={u.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {u.name}{" "}
                    <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{u.roleName}</span>
                    {u.id === meId && <span className="ml-2 text-xs text-neutral-400">(you)</span>}
                  </p>
                  <p className="text-sm text-neutral-500">{u.email}</p>
                </div>
                {u.id !== meId && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => reset(u)}>
                    <KeyRound className="size-3.5" /> Reset password{sendMail && emailReady ? " and email" : ""}
                  </Button>
                )}
              </div>

              {u.roleKey === "MEMBER" && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.pages.length === 0 && <span className="text-xs text-amber-700">No pages assigned yet</span>}
                    {u.pages.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-somerset-green/10 px-2.5 py-1 text-xs font-semibold text-somerset-green">
                        {p.title}
                        <button
                          type="button"
                          aria-label={`Unassign ${p.title}`}
                          onClick={() =>
                            start(async () => {
                              await unassignPageAction(p.id);
                              router.refresh();
                            })
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    <button type="button" className="text-xs font-semibold text-somerset-green hover:underline" onClick={() => setAdding(adding === u.id ? null : u.id)}>
                      + Assign a page
                    </button>
                  </div>
                  {adding === u.id && (
                    <div className="mt-2 max-w-md space-y-2">
                      <PagePicker chosen={addPages} onChange={setAddPages} />
                      <Button
                        size="sm"
                        disabled={pending || addPages.length === 0}
                        onClick={() =>
                          start(async () => {
                            await assignPagesToMemberAction(u.id, addPages.map((p) => p.id));
                            toast.success("Pages assigned");
                            setAddPages([]);
                            setAdding(null);
                            router.refresh();
                          })
                        }
                      >
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
