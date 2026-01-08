import { listDependents, addDependent, updateDependent, deleteDependent } from "./actions";

const RELATIONSHIP_OPTIONS = [
  "Child",
  "Stepchild",
  "Foster child",
  "Grandchild",
  "Sibling",
  "Parent",
  "Other",
] as const;

export default async function DependentsPage({
  params,
}: {
  params: { userId: string };
}) {
  const userId = params.userId;
  const rows = await listDependents(userId);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Dependents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add/edit dependents (DOB, relationship, months in home).
          </p>
        </div>
      </header>

      {/* Add Dependent */}
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Add dependent</h2>

        <form
          action={async (fd) => {
            "use server";
            await addDependent(userId, fd);
          }}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input
            name="firstName"
            placeholder="First name *"
            className="h-10 rounded-xl border px-3"
            required
          />
          <input
            name="middleName"
            placeholder="Middle name"
            className="h-10 rounded-xl border px-3"
          />
          <input
            name="lastName"
            placeholder="Last name *"
            className="h-10 rounded-xl border px-3"
            required
          />
          <input
            name="dob"
            type="date"
            className="h-10 rounded-xl border px-3"
            required
          />

          <select
            name="relationship"
            className="h-10 rounded-xl border px-3"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Relationship *
            </option>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <input
            name="monthsInHome"
            type="number"
            min={0}
            max={12}
            defaultValue={12}
            className="h-10 rounded-xl border px-3"
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="appliedButNotReceived" className="h-4 w-4" />
            Applied but not received SSN
          </label>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isStudent" className="h-4 w-4" />
              Student
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isDisabled" className="h-4 w-4" />
              Disabled
            </label>
          </div>

          <div className="sm:col-span-2">
            <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
              Add dependent
            </button>
          </div>
        </form>
      </section>

      {/* List */}
      <section className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Dependents ({rows.length})
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            No dependents added yet.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((d) => (
              <li key={d.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {d.firstName} {d.middleName ? d.middleName + " " : ""}
                      {d.lastName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      DOB: {String(d.dob)} • {String(d.relationship)} • Months in home:{" "}
                      {d.monthsInHome}
                      {d.isStudent ? " • Student" : ""}
                      {d.isDisabled ? " • Disabled" : ""}
                      {d.appliedButNotReceived ? " • SSN pending" : ""}
                    </div>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await deleteDependent(userId, d.id);
                    }}
                  >
                    <button className="text-sm font-semibold text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>

                {/* Edit */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                    Edit dependent
                  </summary>

                  <form
                    action={async (fd) => {
                      "use server";
                      await updateDependent(userId, d.id, fd);
                    }}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <input
                      name="firstName"
                      defaultValue={d.firstName}
                      className="h-10 rounded-xl border px-3"
                      required
                    />
                    <input
                      name="middleName"
                      defaultValue={d.middleName ?? ""}
                      className="h-10 rounded-xl border px-3"
                    />
                    <input
                      name="lastName"
                      defaultValue={d.lastName}
                      className="h-10 rounded-xl border px-3"
                      required
                    />
                    <input
                      name="dob"
                      type="date"
                      defaultValue={String(d.dob)}
                      className="h-10 rounded-xl border px-3"
                      required
                    />

                    <select
                      name="relationship"
                      defaultValue={String(d.relationship)}
                      className="h-10 rounded-xl border px-3"
                      required
                    >
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <input
                      name="monthsInHome"
                      type="number"
                      min={0}
                      max={12}
                      defaultValue={d.monthsInHome ?? 12}
                      className="h-10 rounded-xl border px-3"
                    />

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="appliedButNotReceived"
                        className="h-4 w-4"
                        defaultChecked={Boolean(d.appliedButNotReceived)}
                      />
                      Applied but not received SSN
                    </label>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isStudent"
                          className="h-4 w-4"
                          defaultChecked={Boolean(d.isStudent)}
                        />
                        Student
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isDisabled"
                          className="h-4 w-4"
                          defaultChecked={Boolean(d.isDisabled)}
                        />
                        Disabled
                      </label>
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
