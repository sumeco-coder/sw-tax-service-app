// app/(client)/dependents/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";

type Dep = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  relationship: string;

  // placeholder (never display/return real encrypted value)
  ssnEncrypted: string;

  // safe status fields
  hasSsn: boolean;
  appliedButNotReceived: boolean;

  monthsLived: number; // 0–12
  isStudent: boolean;
  isDisabled: boolean;
};

// Draft also allows a transient SSN input for updates (never stored in rows)
type DepDraft = Partial<Dep> & { ssn?: string };

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const brandGradient = {
  background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
};

const focusRing =
  "focus:outline-none focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40";

const inputBase =
  `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ` +
  `placeholder:text-slate-400 transition ${focusRing}`;

const inputReadOnly = "bg-slate-50 text-slate-900 border-slate-200";

const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

function digitsOnly(v: unknown, maxLen: number) {
  return String(v ?? "").replace(/\D/g, "").slice(0, maxLen);
}

function normalizeDep(d: any): Dep {
  return {
    id: String(d?.id ?? ""),
    firstName: String(d?.firstName ?? ""),
    middleName: String(d?.middleName ?? ""),
    lastName: String(d?.lastName ?? ""),
    dob: String(d?.dob ?? ""),
    relationship: String(d?.relationship ?? ""),

    ssnEncrypted: "",

    hasSsn: Boolean(d?.hasSsn),
    appliedButNotReceived: Boolean(d?.appliedButNotReceived),

    monthsLived: Number.isFinite(Number(d?.monthsLived))
      ? Math.max(0, Math.min(12, Math.trunc(Number(d?.monthsLived))))
      : 12,

    isStudent: Boolean(d?.isStudent),
    isDisabled: Boolean(d?.isDisabled),
  };
}

export default function DependentsPage() {
  const [rows, setRows] = useState<Dep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DepDraft>({});
  const [showAdd, setShowAdd] = useState(false);

  const [addForm, setAddForm] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
    dob: string;
    relationship: string;
    ssn: string; // transient input (9 digits)
    appliedButNotReceived: boolean;
    monthsLived: number;
    isStudent: boolean;
    isDisabled: boolean;
  }>({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    relationship: "",
    ssn: "",
    appliedButNotReceived: false,
    monthsLived: 12,
    isStudent: false,
    isDisabled: false,
  });

  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dependents", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      const safe = Array.isArray(data) ? data.map(normalizeDep) : [];
      setRows(safe);
      setLoading(false);
    })();
  }, []);

  function startEdit(dep: Dep) {
    setEditId(dep.id);
    // SSN input starts blank; leaving blank means "no change"
    setDraft({ ...dep, ssn: "" });
  }

  function cancelEdit() {
    setEditId(null);
    setDraft({});
  }

  function applyLocalPatch(prev: Dep, patch: DepDraft): Dep {
    const { ssn, ssnEncrypted, ...rest } = patch;

    let next: Dep = {
      ...prev,
      ...rest,
      ssnEncrypted: "",
    };

    // applied toggle influences local status
    if (typeof patch.appliedButNotReceived === "boolean") {
      next.appliedButNotReceived = patch.appliedButNotReceived;
      if (next.appliedButNotReceived) {
        next.hasSsn = false;
      }
    }

    // if user entered a valid SSN, treat as "on file" locally after save
    const ssn9 = digitsOnly(ssn, 9);
    if (ssn9.length === 9) {
      next.hasSsn = true;
      next.appliedButNotReceived = false;
    }

    // months clamp safety
    next.monthsLived = Math.max(
      0,
      Math.min(
        12,
        Number.isFinite(Number(next.monthsLived))
          ? Math.trunc(Number(next.monthsLived))
          : 12
      )
    );

    return next;
  }

  async function saveEdit() {
    if (!editId) return;

    const payload: any = { ...draft };

    // never send placeholder
    delete payload.ssnEncrypted;

    const res = await fetch(`/api/dependents/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setRows((r) =>
        r.map((x) => (x.id === editId ? applyLocalPatch(x, draft) : x))
      );
      setMsg("Saved.");
      cancelEdit();
    } else {
      setMsg("Save failed.");
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/dependents/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
  }

  async function addDependent() {
    const payload = {
      firstName: addForm.firstName,
      middleName: addForm.middleName,
      lastName: addForm.lastName,
      dob: addForm.dob,
      relationship: addForm.relationship,
      monthsLived: addForm.monthsLived,
      isStudent: addForm.isStudent,
      isDisabled: addForm.isDisabled,
      appliedButNotReceived: addForm.appliedButNotReceived,
      ssn: addForm.appliedButNotReceived ? "" : digitsOnly(addForm.ssn, 9),
    };

    const res = await fetch("/api/dependents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created = normalizeDep(await res.json());
      setRows((r) => [created, ...r]);
      setShowAdd(false);
      setAddForm({
        firstName: "",
        middleName: "",
        lastName: "",
        dob: "",
        relationship: "",
        ssn: "",
        appliedButNotReceived: false,
        monthsLived: 12,
        isStudent: false,
        isDisabled: false,
      });
      setMsg("Dependent added.");
    } else {
      setMsg("Add failed.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className={card}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Dependents
              </h1>
              <div className="mt-2 h-1 w-24 rounded-full" style={brandGradient} />
              <p className="mt-3 text-sm text-slate-600">
                Add and manage dependents for your return.
              </p>
            </div>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={brandGradient}
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-4 w-4" /> Add Dependent
            </button>
          </div>

          {msg && (
            <p className="mt-4 text-sm text-slate-600" aria-live="polite">
              {msg}
            </p>
          )}
        </div>

        {/* Content */}
        <div className={card}>
          {loading ? (
            <p className="text-slate-600">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-slate-600">No dependents yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {rows.map((d) => {
                const editing = editId === d.id;

                const fieldClass = (isEditing: boolean) =>
                  `${inputBase} ${isEditing ? "" : inputReadOnly}`;

                const ssnStatus = d.appliedButNotReceived
                  ? "Applied / not received"
                  : d.hasSsn
                  ? "On file"
                  : "Missing";

                return (
                  <div key={d.id} className="py-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start">
                      {/* Name */}
                      <div className="md:col-span-3">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Name
                        </label>

                        <div className="relative space-y-2">
                          <input
                            className={fieldClass(editing)}
                            value={editing ? (draft.firstName ?? "") : d.firstName}
                            onChange={(e) =>
                              setDraft((x) => ({ ...x, firstName: e.target.value }))
                            }
                            disabled={!editing}
                            placeholder="First name"
                          />

                          <input
                            className={fieldClass(editing)}
                            value={editing ? (draft.middleName ?? "") : d.middleName}
                            onChange={(e) =>
                              setDraft((x) => ({ ...x, middleName: e.target.value }))
                            }
                            disabled={!editing}
                            placeholder="Middle name (optional)"
                          />

                          <input
                            className={fieldClass(editing)}
                            value={editing ? (draft.lastName ?? "") : d.lastName}
                            onChange={(e) =>
                              setDraft((x) => ({ ...x, lastName: e.target.value }))
                            }
                            disabled={!editing}
                            placeholder="Last name"
                          />

                          {/* Row actions */}
                          {!editing ? (
                            <button
                              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              onClick={() => startEdit(d)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="absolute right-2 top-2 flex gap-2">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm hover:opacity-90"
                                style={brandGradient}
                                onClick={saveEdit}
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                onClick={cancelEdit}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* DOB */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          DOB
                        </label>
                        <input
                          className={fieldClass(editing)}
                          placeholder="YYYY-MM-DD"
                          value={editing ? (draft.dob ?? "") : d.dob}
                          onChange={(e) =>
                            setDraft((x) => ({ ...x, dob: e.target.value }))
                          }
                          disabled={!editing}
                        />
                      </div>

                      {/* Relationship */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Relationship
                        </label>
                        <select
                          className={fieldClass(editing)}
                          value={editing ? (draft.relationship ?? "") : d.relationship}
                          onChange={(e) =>
                            setDraft((x) => ({ ...x, relationship: e.target.value }))
                          }
                          disabled={!editing}
                        >
                          <option value="">Select…</option>
                          <option>Child</option>
                          <option>Stepchild</option>
                          <option>Foster child</option>
                          <option>Sibling</option>
                          <option>Parent</option>
                          <option>Other</option>
                        </select>
                      </div>

                      {/* SSN status + update */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          SSN
                        </label>

                        {!editing ? (
                          <input
                            className={`${inputBase} ${inputReadOnly}`}
                            value={ssnStatus}
                            disabled
                          />
                        ) : (
                          <div className="space-y-2">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#E72B69]"
                                checked={Boolean(draft.appliedButNotReceived)}
                                onChange={(e) =>
                                  setDraft((x) => ({
                                    ...x,
                                    appliedButNotReceived: e.target.checked,
                                    ssn: e.target.checked ? "" : x.ssn,
                                  }))
                                }
                              />
                              Applied / not received
                            </label>

                            <input
                              className={inputBase}
                              placeholder="SSN (9 digits)"
                              inputMode="numeric"
                              maxLength={9}
                              value={draft.ssn ?? ""}
                              onChange={(e) =>
                                setDraft((x) => ({
                                  ...x,
                                  ssn: e.target.value.replace(/\D/g, "").slice(0, 9),
                                }))
                              }
                              disabled={Boolean(draft.appliedButNotReceived)}
                            />

                            <p className="text-xs text-slate-500">
                              {d.hasSsn ? "Currently on file. " : ""}
                              Leaving SSN blank keeps it unchanged.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Months lived */}
                      <div className="md:col-span-1">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Months
                        </label>
                        <input
                          className={fieldClass(editing)}
                          inputMode="numeric"
                          value={editing ? (draft.monthsLived ?? 12) : d.monthsLived}
                          onChange={(e) =>
                            setDraft((x) => ({
                              ...x,
                              monthsLived: Math.max(
                                0,
                                Math.min(12, Number(e.target.value) || 0)
                              ),
                            }))
                          }
                          disabled={!editing}
                        />
                      </div>

                      {/* Flags */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Flags
                        </label>
                        <div
                          className={`flex items-center gap-4 rounded-xl border border-slate-200 px-3 py-2 ${
                            editing ? "bg-white" : "bg-slate-50 opacity-80"
                          }`}
                        >
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#E72B69]"
                              checked={editing ? Boolean(draft.isStudent) : d.isStudent}
                              onChange={(e) =>
                                setDraft((x) => ({ ...x, isStudent: e.target.checked }))
                              }
                              disabled={!editing}
                            />
                            Student
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#E72B69]"
                              checked={editing ? Boolean(draft.isDisabled) : d.isDisabled}
                              onChange={(e) =>
                                setDraft((x) => ({ ...x, isDisabled: e.target.checked }))
                              }
                              disabled={!editing}
                            />
                            Disabled
                          </label>
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="md:col-span-12">
                        <button
                          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                          onClick={() => remove(d.id)}
                          title="Remove dependent"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add Dependent</h2>
                <div className="mt-2 h-1 w-16 rounded-full" style={brandGradient} />
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className={inputBase}
                placeholder="First name"
                value={addForm.firstName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />

              <input
                className={inputBase}
                placeholder="Last name"
                value={addForm.lastName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />

              <input
                className={`${inputBase} sm:col-span-2`}
                placeholder="Middle name (optional)"
                value={addForm.middleName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, middleName: e.target.value }))
                }
              />

              <input
                className={inputBase}
                placeholder="DOB (YYYY-MM-DD)"
                value={addForm.dob}
                onChange={(e) => setAddForm((f) => ({ ...f, dob: e.target.value }))}
              />

              <select
                className={inputBase}
                value={addForm.relationship}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, relationship: e.target.value }))
                }
              >
                <option value="">Relationship</option>
                <option>Child</option>
                <option>Stepchild</option>
                <option>Foster child</option>
                <option>Sibling</option>
                <option>Parent</option>
                <option>Other</option>
              </select>

              <label className="sm:col-span-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#E72B69]"
                  checked={addForm.appliedButNotReceived}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      appliedButNotReceived: e.target.checked,
                      ssn: e.target.checked ? "" : f.ssn,
                    }))
                  }
                />
                Applied / not received (SSN not available yet)
              </label>

              <input
                className={`${inputBase} sm:col-span-2`}
                placeholder="SSN (9 digits)"
                inputMode="numeric"
                maxLength={9}
                value={addForm.ssn}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    ssn: e.target.value.replace(/\D/g, "").slice(0, 9),
                  }))
                }
                disabled={addForm.appliedButNotReceived}
              />

              <input
                className={inputBase}
                placeholder="Months lived (0-12)"
                inputMode="numeric"
                value={String(addForm.monthsLived)}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    monthsLived: Math.max(
                      0,
                      Math.min(12, Number(e.target.value) || 0)
                    ),
                  }))
                }
              />

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#E72B69]"
                  checked={addForm.isStudent}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, isStudent: e.target.checked }))
                  }
                />
                Student
              </label>

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#E72B69]"
                  checked={addForm.isDisabled}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, isDisabled: e.target.checked }))
                  }
                />
                Disabled
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                style={brandGradient}
                onClick={addDependent}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
