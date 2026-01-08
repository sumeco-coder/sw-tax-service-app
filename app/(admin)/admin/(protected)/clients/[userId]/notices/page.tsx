import { listNotices, addNotice, updateNotice, deleteNotice } from "./actions";

const AGENCIES = ["IRS", "STATE", "FTB", "OTHER"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "RESPONDED", "RESOLVED"] as const;

export default async function NoticesPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  const rows = await listNotices(userId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Notices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track IRS/State letters, deadlines, and resolution notes.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Add notice</h2>

        <form
          action={async (fd) => { "use server"; await addNotice(userId, fd); }}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <select name="agency" defaultValue="IRS" className="h-10 rounded-xl border px-3">
            {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select name="status" defaultValue="OPEN" className="h-10 rounded-xl border px-3">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          </select>

          <input name="noticeNumber" placeholder="Notice number (e.g., CP2000)" className="h-10 rounded-xl border px-3" />
          <input name="taxYear" placeholder="Tax year (e.g., 2023)" className="h-10 rounded-xl border px-3" inputMode="numeric" />

          <input name="receivedDate" type="date" className="h-10 rounded-xl border px-3" />
          <input name="dueDate" type="date" className="h-10 rounded-xl border px-3" />

          <div className="sm:col-span-2">
            <textarea name="summary" placeholder="Summary" className="min-h-[90px] w-full rounded-xl border p-3" />
          </div>

          <div className="sm:col-span-2">
            <textarea name="resolutionNotes" placeholder="Resolution notes" className="min-h-[90px] w-full rounded-xl border p-3" />
          </div>

          <div className="sm:col-span-2">
            <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
              Add notice
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notices ({rows.length})</div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">No notices logged yet.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((n) => (
              <li key={n.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {String(n.agency)} {n.noticeNumber ? `• ${n.noticeNumber}` : ""}
                      {n.taxYear ? ` • TY ${n.taxYear}` : ""}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Status: {String(n.status)}{" "}
                      {n.dueDate ? `• Due: ${String(n.dueDate)}` : ""}
                      {n.receivedDate ? `• Received: ${String(n.receivedDate)}` : ""}
                    </div>
                    {n.summary ? <div className="mt-2 text-sm text-foreground/90">{String(n.summary)}</div> : null}
                  </div>

                  <form action={async () => { "use server"; await deleteNotice(userId, n.id); }}>
                    <button className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                    Edit notice
                  </summary>

                  <form
                    action={async (fd) => { "use server"; await updateNotice(userId, n.id, fd); }}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <select name="agency" defaultValue={String(n.agency)} className="h-10 rounded-xl border px-3">
                      {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select name="status" defaultValue={String(n.status)} className="h-10 rounded-xl border px-3">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
                    </select>

                    <input name="noticeNumber" defaultValue={n.noticeNumber ?? ""} className="h-10 rounded-xl border px-3" />
                    <input name="taxYear" defaultValue={n.taxYear ?? ""} className="h-10 rounded-xl border px-3" />

                    <input name="receivedDate" type="date" defaultValue={n.receivedDate ? String(n.receivedDate) : ""} className="h-10 rounded-xl border px-3" />
                    <input name="dueDate" type="date" defaultValue={n.dueDate ? String(n.dueDate) : ""} className="h-10 rounded-xl border px-3" />

                    <div className="sm:col-span-2">
                      <textarea name="summary" defaultValue={n.summary ?? ""} className="min-h-[90px] w-full rounded-xl border p-3" />
                    </div>
                    <div className="sm:col-span-2">
                      <textarea name="resolutionNotes" defaultValue={n.resolutionNotes ?? ""} className="min-h-[90px] w-full rounded-xl border p-3" />
                    </div>

                    <div className="sm:col-span-2">
                      <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
                        Save changes
                      </button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
