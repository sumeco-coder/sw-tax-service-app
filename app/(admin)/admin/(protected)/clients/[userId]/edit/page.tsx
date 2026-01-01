//app/(admin)/admin/(protected)/clients/[userId]/edit/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { updateClientProfile } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientEditPage({
  params,
}: {
  params: { userId: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";
  if (!isAdmin) return redirect("/admin");

  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address1: users.address1,
      address2: users.address2,
      city: users.city,
      state: users.state,
      zip: users.zip,
      adminNotes: users.adminNotes,
      status: users.status,
      disabledReason: users.disabledReason,
    })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!u) return redirect("/admin/clients");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-black">Edit Client</h1>
          <p className="text-sm text-black/60">{u.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/clients/${u.id}/documents`}
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 transition"
          >
            Docs
          </Link>
          <Link
            href={`/admin/clients/${u.id}/messages`}
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 transition"
          >
            Messages
          </Link>
          <Link
            href="/admin/clients"
            className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 transition"
          >
            Back
          </Link>
        </div>
      </div>

      <form action={updateClientProfile} className="rounded-3xl border border-black/10 bg-white p-4 sm:p-6 space-y-4">
        <input type="hidden" name="userId" value={u.id} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-black/70">Name</label>
            <input
              name="name"
              defaultValue={u.name ?? ""}
              className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-black/70">Phone</label>
            <input
              name="phone"
              defaultValue={u.phone ?? ""}
              className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-black/70">Address 1</label>
            <input
              name="address1"
              defaultValue={u.address1 ?? ""}
              className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-black/70">Address 2</label>
            <input
              name="address2"
              defaultValue={u.address2 ?? ""}
              className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-black/70">City</label>
            <input
              name="city"
              defaultValue={u.city ?? ""}
              className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-black/70">State</label>
              <input
                name="state"
                defaultValue={u.state ?? ""}
                className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-black/70">ZIP</label>
              <input
                name="zip"
                defaultValue={u.zip ?? ""}
                className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-black/70">Admin Notes</label>
          <textarea
            name="adminNotes"
            defaultValue={u.adminNotes ?? ""}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="flex justify-end">
          <button className="rounded-2xl bg-black px-4 py-2 text-sm text-white hover:bg-black/90 transition">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
