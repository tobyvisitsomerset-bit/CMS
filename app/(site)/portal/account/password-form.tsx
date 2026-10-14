"use client";

import { useRef, useState, useTransition } from "react";
import { changePasswordAction, type PasswordResult } from "@/app/(site)/portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm() {
  const [state, setState] = useState<PasswordResult | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="mt-5 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await changePasswordAction(null, data);
          setState(result);
          if (result.ok) formRef.current?.reset();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="next">New password (at least 10 characters)</Label>
        <Input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm font-medium text-somerset-green">Password changed.</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
