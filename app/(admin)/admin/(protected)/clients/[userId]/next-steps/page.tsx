import { addNextStep, deleteNextStep, listNextSteps, markDone, updateNextStep } from "./actions";

const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
const STATUSES = ["OPEN", "DONE"] as const;

export default async function NextStepsPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  const rows = await listNextSteps(userId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Next steps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What the client needs to do next (documents, signatures, payments, etc.).
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Add step</h2>

        <form
          action={async (fd) => { "use server"; await addNextStep(userId, fd); }}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input name="title" placeholder="Title *" required className="h-10 rounded-xl border px-3" />
          <select name="priority" defaultValue="NORMAL" className="h-10 rounded-xl border px-3">
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <input name="dueDate" type="date" className="h-10 rounded-xl border px-3" />

          <div className="sm:col-span-2">
            <textarea name="details" placeholder="Details" className="min-h-[90px] w-full rounded-xl border p-3" />
          </div>

          <div className="sm:col-span-2">
            <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
              Add step
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold">Steps ({rows.length})</div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">No steps added yet.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((x) => (
              <li key={x.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {x.title}{" "}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {String(x.priority)} • {String(x.status)}
                        {x.dueDate ? ` • Due: ${String(x.dueDate)}` : ""}
                      </span>
                    </div>
                    {x.details ? <div className="mt-2 text-sm text-foreground/90">{String(x.details)}</div> : null}
                  </div>

                  <div className="flex items-center gap-3">
                    {String(x.status) !== "DONE" ? (
                      <form action={async () => { "use server"; await markDone(userId, x.id); }}>
                        <button className="text-sm font-semibold hover:underline">
                          Mark done
                        </button>
                      </form>
                    ) : null}

                    <form action={async () => { "use server"; await deleteNextStep(userId, x.id); }}>
                      <button className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
                    </form>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                    Edit step
                  </summary>

                  <form
                    action={async (fd) => { "use server"; await updateNextStep(userId, x.id, fd); }}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <input name="title" defaultValue={x.title} required className="h-10 rounded-xl border px-3" />

                    <select name="priority" defaultValue={String(x.priority)} className="h-10 rounded-xl border px-3">
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select name="status" defaultValue={String(x.status)} className="h-10 rounded-xl border px-3">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <input name="dueDate" type="date" defaultValue={x.dueDate ? String(x.dueDate) : ""} className="h-10 rounded-xl border px-3" />

                    <div className="sm:col-span-2">
                      <textarea name="details" defaultValue={x.details ?? ""} className="min-h-[90px] w-full rounded-xl border p-3" />
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
