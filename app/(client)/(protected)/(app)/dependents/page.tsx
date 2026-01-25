// app/(client)/(protected)/(app)/dependents/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Check, X, Plus, Trash2, Eye, EyeOff } from "lucide-react";

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
  return String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLen);
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

// Safe API helper: shows server error messages when present
async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  fallback = "Request failed",
) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.error || fallback;
    throw new Error(msg);
  }
  return data as T;
}

export default function DependentsPage() {
  const [rows, setRows] = useState<Dep[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DepDraft>({});
  const [showAdd, setShowAdd] = useState(false);

  // ✅ eye toggles for SSN inputs
  const [showEditSsn, setShowEditSsn] = useState(false);
  const [showAddSsn, setShowAddSsn] = useState(false);

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

  async function loadDependents() {
    try {
      const data = await fetchJson<any[]>(
        "/api/dependents",
        { cache: "no-store" },
        "Failed to load dependents",
      );
      const safe = Array.isArray(data) ? data.map(normalizeDep) : [];
      setRows(safe);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load dependents.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDependents();
  }, []);

  const editingRow = useMemo(
    () => rows.find((r) => r.id === editId) ?? null,
    [rows, editId],
  );

  function startEdit(dep: Dep) {
    setEditId(dep.id);
    setShowEditSsn(false);
    // keep draft minimal + add blank SSN (blank means "no change")
    setDraft({
      firstName: dep.firstName,
      middleName: dep.middleName,
      lastName: dep.lastName,
      dob: dep.dob,
      relationship: dep.relationship,
      appliedButNotReceived: dep.appliedButNotReceived,
      monthsLived: dep.monthsLived,
      isStudent: dep.isStudent,
      isDisabled: dep.isDisabled,
      ssn: "",
    });
    setMsg("");
  }

  function cancelEdit() {
    setEditId(null);
    setDraft({});
    setShowEditSsn(false);
  }

  function applyLocalPatch(prev: Dep, patch: DepDraft): Dep {
    const { ssn, ssnEncrypted, ...rest } = patch;

    const next: Dep = {
      ...prev,
      ...rest,
      ssnEncrypted: "",
    };

    // applied toggle influences local status
    if (typeof patch.appliedButNotReceived === "boolean") {
      next.appliedButNotReceived = patch.appliedButNotReceived;
      if (next.appliedButNotReceived) next.hasSsn = false;
    }

    // if user entered a valid SSN, treat as "on file" locally after save
    const ssn9 = digitsOnly(ssn, 9);
    if (ssn9.length === 9) {
      next.hasSsn = true;
      next.appliedButNotReceived = false;
    }

    next.monthsLived = Math.max(
      0,
      Math.min(
        12,
        Number.isFinite(Number(next.monthsLived))
          ? Math.trunc(Number(next.monthsLived))
          : 12,
      ),
    );

    return next;
  }

  // Build a clean PATCH payload (only fields your API supports)
  function buildPatchPayload(current: Dep | null, d: DepDraft) {
    const payload: any = {};

    if (typeof d.firstName === "string") payload.firstName = d.firstName;
    if (typeof d.middleName === "string") payload.middleName = d.middleName;
    if (typeof d.lastName === "string") payload.lastName = d.lastName;

    if (typeof d.dob === "string") payload.dob = d.dob;
    if (typeof d.relationship === "string")
      payload.relationship = d.relationship;

    if (d.monthsLived != null) payload.monthsLived = d.monthsLived;
    if (d.isStudent != null) payload.isStudent = Boolean(d.isStudent);
    if (d.isDisabled != null) payload.isDisabled = Boolean(d.isDisabled);

    // applied + SSN rules
    const applied = Boolean(d.appliedButNotReceived);
    payload.appliedButNotReceived = applied;

    const ssn9 = digitsOnly(d.ssn ?? "", 9);

    // If they check applied=true, do not send ssn at all
    if (applied) {
      return payload;
    }

    if (!ssn9) {
      if (current?.appliedButNotReceived && !current?.hasSsn) {
      }
      return payload;
    }

    if (ssn9.length !== 9) {
      throw new Error("SSN must be 9 digits.");
    }

    payload.ssn = ssn9;
    return payload;
  }

  async function saveEdit() {
    if (!editId) return;

    try {
      setMsg("");

      const payload = buildPatchPayload(editingRow, draft);

      const data = await fetch(`/api/dependents/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Try to read JSON; some versions may return { success: true }
      const body = await data.json().catch(() => null);

      if (!data.ok) {
        const serverMsg = body?.error || "Save failed.";
        throw new Error(serverMsg);
      }

      // If PATCH returns the updated dependent, use it (best)
      if (body && typeof body === "object" && body.id) {
        const updated = normalizeDep(body);
        setRows((r) => r.map((x) => (x.id === editId ? updated : x)));
      } else {
        // Fallback: local patch update (works even if PATCH returns {success:true})
        setRows((r) =>
          r.map((x) => (x.id === editId ? applyLocalPatch(x, draft) : x)),
        );
      }

      setMsg("Saved.");
      cancelEdit();
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed.");
    }
  }

  async function remove(id: string) {
    try {
      setMsg("");
      await fetchJson(
        `/api/dependents/${id}`,
        { method: "DELETE" },
        "Remove failed.",
      );
      setRows((r) => r.filter((x) => x.id !== id));
      setMsg("Removed.");
    } catch (e: any) {
      setMsg(e?.message ?? "Remove failed.");
    }
  }

  async function addDependent() {
    try {
      setMsg("");

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

      const createdRaw = await fetchJson<any>(
        "/api/dependents",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Add failed.",
      );

      const created = normalizeDep(createdRaw);
      setRows((r) => [created, ...r]);

      setShowAdd(false);
      setShowAddSsn(false);

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
    } catch (e: any) {
      setMsg(e?.message ?? "Add failed.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className={card}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Dependents
              </h1>
              <div
                className="mt-2 h-1 w-24 rounded-full"
                style={brandGradient}
              />
              <p className="mt-3 text-sm text-slate-600">
                Add and manage dependents for your return.
              </p>
            </div>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={brandGradient}
              onClick={() => {
                setShowAdd(true);
                setShowAddSsn(false);
              }}
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
            <div className="space-y-4">
              {rows.map((d) => {
                const editing = editId === d.id;

                const fieldClass = (isEditing: boolean) =>
                  `${inputBase} ${isEditing ? "" : inputReadOnly}`;

                const ssnStatus = d.appliedButNotReceived
                  ? "Applied / not received"
                  : d.hasSsn
                    ? "On file"
                    : "Missing";

                const ssnBadge = d.appliedButNotReceived
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : d.hasSsn
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200";

                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
                  >
                    {/* Row header (prevents overlap on iPad) */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-slate-900">
                            {d.firstName} {d.lastName}
                          </h3>

                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${ssnBadge}`}
                            title="SSN status"
                          >
                            SSN: {ssnStatus}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Edit fields below, then save.
                        </p>
                      </div>

                      {/* Actions */}
                      {!editing ? (
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => startEdit(d)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex w-full gap-2 sm:w-auto">
                          <button
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 sm:flex-none"
                            style={brandGradient}
                            onClick={saveEdit}
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
                            onClick={cancelEdit}
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Responsive grid:
                    - On iPad/narrow content area, keep it stacked/2-col.
                    - Only go 12-col on XL screens.
                 */}
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
                      {/* Name group */}
                      <div className="sm:col-span-2 xl:col-span-5">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Name
                        </label>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <input
                            className={fieldClass(editing)}
                            value={
                              editing ? (draft.firstName ?? "") : d.firstName
                            }
                            onChange={(e) =>
                              setDraft((x) => ({
                                ...x,
                                firstName: e.target.value,
                              }))
                            }
                            disabled={!editing}
                            placeholder="First"
                          />
                          <input
                            className={fieldClass(editing)}
                            value={
                              editing ? (draft.middleName ?? "") : d.middleName
                            }
                            onChange={(e) =>
                              setDraft((x) => ({
                                ...x,
                                middleName: e.target.value,
                              }))
                            }
                            disabled={!editing}
                            placeholder="Middle"
                          />
                          <input
                            className={fieldClass(editing)}
                            value={
                              editing ? (draft.lastName ?? "") : d.lastName
                            }
                            onChange={(e) =>
                              setDraft((x) => ({
                                ...x,
                                lastName: e.target.value,
                              }))
                            }
                            disabled={!editing}
                            placeholder="Last"
                          />
                        </div>
                      </div>

                      {/* DOB */}
                      <div className="xl:col-span-2">
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
                      <div className="xl:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Relationship
                        </label>
                        <select
                          className={fieldClass(editing)}
                          value={
                            editing
                              ? (draft.relationship ?? "")
                              : d.relationship
                          }
                          onChange={(e) =>
                            setDraft((x) => ({
                              ...x,
                              relationship: e.target.value,
                            }))
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

                      {/* Months */}
                      <div className="xl:col-span-1">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Months
                        </label>
                        <input
                          className={fieldClass(editing)}
                          inputMode="numeric"
                          value={
                            editing ? (draft.monthsLived ?? 12) : d.monthsLived
                          }
                          onChange={(e) =>
                            setDraft((x) => ({
                              ...x,
                              monthsLived: Math.max(
                                0,
                                Math.min(12, Number(e.target.value) || 0),
                              ),
                            }))
                          }
                          disabled={!editing}
                        />
                      </div>

                      {/* SSN */}
                      <div className="sm:col-span-2 xl:col-span-2">
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

                            {/* ✅ Masked SSN input + eye toggle */}
                            <div className="relative">
                              <input
                                className={`${inputBase} pr-10`}
                                placeholder="SSN (9 digits)"
                                inputMode="numeric"
                                maxLength={9}
                                autoComplete="off"
                                type={showEditSsn ? "text" : "password"}
                                value={draft.ssn ?? ""}
                                onChange={(e) =>
                                  setDraft((x) => ({
                                    ...x,
                                    ssn: e.target.value.replace(/\D/g, "").slice(0, 9),
                                  }))
                                }
                                disabled={Boolean(draft.appliedButNotReceived)}
                              />

                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-1 text-slate-700 hover:bg-slate-50"
                                onClick={() => setShowEditSsn((v) => !v)}
                                aria-label={
                                  showEditSsn ? "Hide SSN" : "Show SSN"
                                }
                              >
                                {showEditSsn ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>

                            <p className="text-xs text-slate-500">
                              {d.hasSsn ? "Currently on file. " : ""}
                              Leaving SSN blank keeps it unchanged.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Flags */}
                      <div className="sm:col-span-2 xl:col-span-12">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Flags
                        </label>

                        <div
                          className={`flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 px-3 py-2 ${
                            editing ? "bg-white" : "bg-slate-50 opacity-90"
                          }`}
                        >
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#E72B69]"
                              checked={
                                editing ? Boolean(draft.isStudent) : d.isStudent
                              }
                              onChange={(e) =>
                                setDraft((x) => ({
                                  ...x,
                                  isStudent: e.target.checked,
                                }))
                              }
                              disabled={!editing}
                            />
                            Student
                          </label>

                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#E72B69]"
                              checked={
                                editing
                                  ? Boolean(draft.isDisabled)
                                  : d.isDisabled
                              }
                              onChange={(e) =>
                                setDraft((x) => ({
                                  ...x,
                                  isDisabled: e.target.checked,
                                }))
                              }
                              disabled={!editing}
                            />
                            Disabled
                          </label>
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="sm:col-span-2 xl:col-span-12">
                        <div className="flex justify-end">
                          <button
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                            onClick={() => remove(d.id)}
                            title="Remove dependent"
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Add Dependent
                </h2>
                <div
                  className="mt-2 h-1 w-16 rounded-full"
                  style={brandGradient}
                />
              </div>
             <button
                onClick={() => {
                  setShowAdd(false);
                  setShowAddSsn(false);
                }}
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
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, dob: e.target.value }))
                }
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

                 {/* ✅ Masked SSN input + eye toggle (Add Modal) */}
              <div className="relative sm:col-span-2">
                <input
                  className={`${inputBase} pr-10`}
                  placeholder="SSN (9 digits)"
                  inputMode="numeric"
                  maxLength={9}
                  autoComplete="off"
                  type={showAddSsn ? "text" : "password"}
                  value={addForm.ssn}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      ssn: e.target.value.replace(/\D/g, "").slice(0, 9),
                    }))
                  }
                  disabled={addForm.appliedButNotReceived}
                />

                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-1 text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowAddSsn((v) => !v)}
                  aria-label={showAddSsn ? "Hide SSN" : "Show SSN"}
                  disabled={addForm.appliedButNotReceived}
                >
                  {showAddSsn ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>


             <input
                className={inputBase}
                placeholder="Months lived (0-12)"
                inputMode="numeric"
                value={String(addForm.monthsLived)}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    monthsLived: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
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
                onClick={() => {
                  setShowAdd(false);
                  setShowAddSsn(false);
                }}
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
