import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { photoImportStatus } from "@/lib/photo-import";
import { PhotoImporter } from "@/components/cms/photo-importer";

export const dynamic = "force-dynamic";

export default async function ImportPhotosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasCapability(session.user.roleKey, "members.manage")) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">You don&apos;t have access to this.</div>;
  }
  const status = await photoImportStatus();
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Recover photos from the current site</h1>
        <p className="text-sm text-neutral-500">
          The Kentico export listed every page&apos;s photo but did not include the picture files. The current Visit Somerset website still
          has them, so this fetches each one, shrinks it to web size and adds it to the page. It only fills photos that are empty, so
          nothing you have uploaded is replaced. It must be finished before the old website is switched off.
        </p>
      </div>
      <PhotoImporter initial={status} />
    </div>
  );
}
