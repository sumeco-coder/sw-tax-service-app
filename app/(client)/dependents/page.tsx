// app/(main)/dependents/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";

type Dep = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;             // YYYY-MM-DD
  relationship: string;
  ssnLast4: string;        // masked in UI
  monthsLived: number;     // 0–12
  isStudent: boolean;
  isDisabled: boolean;
};

export default function DependentsPage() {
  const [rows, setRows] = useState<Dep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Dep>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Dep>>({
    firstName: "",
    lastName: "",
    dob: "",
    relationship: "",
    ssnLast4: "",
    monthsLived: 12,
    isStudent: false,
    isDisabled: false,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dependents", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setRows(data);
      setLoading(false);
    })();
  }, []);

  function startEdit(dep: Dep) {
    setEditId(dep.id);
    setDraft({ ...dep });
  }
  function cancelEdit() {
    setEditId(null);
    setDraft({});
  }

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch(`/api/dependents/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setRows((r) => r.map((x) => (x.id === editId ? { ...x, ...draft } as Dep : x)));
      setMsg("Saved.");
      cancelEdit();
    } else setMsg("Save failed.");
  }

  async function remove(id: string) {
    const res = await fetch(`/api/dependents/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
  }

  async function addDependent() {
    const res = await fetch("/api/dependents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      const created = await res.json();
      setRows((r) => [created, ...r]);
      setShowAdd(false);
      setAddForm({
        firstName: "",
        lastName: "",
        dob: "",
        relationship: "",
        ssnLast4: "",
        monthsLived: 12,
        isStudent: false,
        isDisabled: false,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-900">Dependents</h1>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4" /> Add Dependent
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-gray-600">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-gray-600">No dependents yet.</p>
        ) : (
          <div className="mt-6 divide-y">
            {rows.map((d) => {
              const editing = editId === d.id;
              return (
                <div key={d.id} className="py-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Name */}
                  <div className="md:col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <div className="relative">
                      <input
                        className={`border w-full rounded-lg p-2 pr-10 ${editing ? "" : "bg-gray-50"}`}
                        value={editing ? (draft.firstName ?? "") : d.firstName}
                        onChange={(e) => setDraft((x) => ({ ...x, firstName: e.target.value }))}
                        disabled={!editing}
                      />
                      <input
                        className={`border w-full rounded-lg p-2 pr-10 mt-2 ${editing ? "" : "bg-gray-50"}`}
                        value={editing ? (draft.lastName ?? "") : d.lastName}
                        onChange={(e) => setDraft((x) => ({ ...x, lastName: e.target.value }))}
                        disabled={!editing}
                      />
                      {!editing ? (
                        <button
                          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                          onClick={() => startEdit(d)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <button
                            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                            onClick={saveEdit}
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button className="p-1 rounded hover:bg-gray-100" onClick={cancelEdit} title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">DOB</label>
                    <input
                      className={`border w-full rounded-lg p-2 ${editing ? "" : "bg-gray-50"}`}
                      placeholder="YYYY-MM-DD"
                      value={editing ? (draft.dob ?? "") : d.dob}
                      onChange={(e) => setDraft((x) => ({ ...x, dob: e.target.value }))}
                      disabled={!editing}
                    />
                  </div>

                  {/* Relationship */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Relationship</label>
                    <select
                      className={`border w-full rounded-lg p-2 ${editing ? "" : "bg-gray-50"}`}
                      value={editing ? (draft.relationship ?? "") : d.relationship}
                      onChange={(e) => setDraft((x) => ({ ...x, relationship: e.target.value }))}
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

                  {/* SSN last4 */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">SSN (Last 4)</label>
                    <input
                      className={`border w-full rounded-lg p-2 ${editing ? "" : "bg-gray-50"}`}
                      inputMode="numeric"
                      maxLength={4}
                      value={editing ? (draft.ssnLast4 ?? "") : d.ssnLast4}
                      onChange={(e) =>
                        setDraft((x) => ({ ...x, ssnLast4: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                      }
                      disabled={!editing}
                    />
                  </div>

                  {/* Months lived */}
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Months</label>
                    <input
                      className={`border w-full rounded-lg p-2 ${editing ? "" : "bg-gray-50"}`}
                      inputMode="numeric"
                      value={editing ? (draft.monthsLived ?? 12) : d.monthsLived}
                      onChange={(e) =>
                        setDraft((x) => ({
                          ...x,
                          monthsLived: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                        }))
                      }
                      disabled={!editing}
                    />
                  </div>

                  {/* Flags */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Flags</label>
                    <div className={`flex items-center gap-4 ${editing ? "" : "opacity-60"}`}>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing ? Boolean(draft.isStudent) : d.isStudent}
                          onChange={(e) => setDraft((x) => ({ ...x, isStudent: e.target.checked }))}
                          disabled={!editing}
                        />
                        <span className="text-sm">Student</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing ? Boolean(draft.isDisabled) : d.isDisabled}
                          onChange={(e) => setDraft((x) => ({ ...x, isDisabled: e.target.checked }))}
                          disabled={!editing}
                        />
                        <span className="text-sm">Disabled</span>
                      </label>
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="md:col-span-12">
                    <button
                      className="mt-2 inline-flex items-center gap-2 text-red-600 hover:text-red-700"
                      onClick={() => remove(d.id)}
                      title="Remove dependent"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}
      </div>

      {/* Add Modal (simple inline card) */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Dependent</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="border p-2 rounded"
                placeholder="First name"
                value={addForm.firstName ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
              />
              <input
                className="border p-2 rounded"
                placeholder="Last name"
                value={addForm.lastName ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
              />
              <input
                className="border p-2 rounded"
                placeholder="DOB (YYYY-MM-DD)"
                value={addForm.dob ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, dob: e.target.value }))}
              />
              <select
                className="border p-2 rounded"
                value={addForm.relationship ?? ""}
                onChange={(e) => setAddForm((f) => ({ ...f, relationship: e.target.value }))}
              >
                <option value="">Relationship</option>
                <option>Child</option>
                <option>Stepchild</option>
                <option>Foster child</option>
                <option>Sibling</option>
                <option>Parent</option>
                <option>Other</option>
              </select>
              <input
                className="border p-2 rounded"
                placeholder="SSN last 4"
                inputMode="numeric"
                maxLength={4}
                value={addForm.ssnLast4 ?? ""}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, ssnLast4: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Months lived (0-12)"
                inputMode="numeric"
                value={String(addForm.monthsLived ?? 12)}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    monthsLived: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                  }))
                }
              />
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(addForm.isStudent)}
                  onChange={(e) => setAddForm((f) => ({ ...f, isStudent: e.target.checked }))}
                />
                <span>Student</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(addForm.isDisabled)}
                  onChange={(e) => setAddForm((f) => ({ ...f, isDisabled: e.target.checked }))}
                />
                <span>Disabled</span>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500" onClick={addDependent}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
