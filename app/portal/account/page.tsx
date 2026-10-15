import { auth } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="max-w-xl">
      <h1 className="mb-5 font-serif text-2xl font-bold text-deep-green">Account</h1>

      <div className="rounded-2xl border bg-white p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-deep-green">Change your password</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
