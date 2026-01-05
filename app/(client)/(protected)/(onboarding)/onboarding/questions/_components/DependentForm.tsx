// app/(client)/(protected)/onboarding/questions/_components/DependentForm.tsx
"use client";

import type { ReactNode } from "react";

export type DependentInput = {
  clientId: string; // stable key for React
  firstName: string;
  middleName: string; // optional
  lastName: string;
  dob: string; // YYYY-MM-DD
  relationship: string;
  ssn: string; // formatted or digits; server normalizes
};

function makeClientId() {
  // crypto.randomUUID exists in modern browsers; fallback just in case
  // (this is a client component so it's safe)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  return typeof c?.randomUUID === "function"
    ? c.randomUUID()
    : `dep_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function emptyDependent(): DependentInput {
  return {
    clientId: makeClientId(),
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    relationship: "",
    ssn: "",
  };
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function formatSSN(input: string) {
  const d = digitsOnly(input).slice(0, 9);
  const a = d.slice(0, 3);
  const b = d.slice(3, 5);
  const c = d.slice(5, 9);
  if (d.length <= 3) return a;
  if (d.length <= 5) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

const RELATIONSHIP_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "stepchild", label: "Stepchild" },
  { value: "fosterChild", label: "Foster child" },
  { value: "grandchild", label: "Grandchild" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "otherRelative", label: "Other relative" },
  { value: "other", label: "Other" },
];

export function DependentForm(props: {
  enabled: boolean;
  dependents: DependentInput[];
  dependentsCount?: string;

  onAdd: () => void;
  onRemove: (clientId: string) => void;
  onChange: (clientId: string, patch: Partial<DependentInput>) => void;
}) {
  return (
    <div className="pt-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Dependents details
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add each dependent you plan to claim.{" "}
            <span className="font-semibold text-foreground">SSN is required</span>
            . (We’ll encrypt it on the server.)
          </p>
        </div>

        <button
          type="button"
          onClick={props.onAdd}
          disabled={!props.enabled}
          className={[
            "shrink-0 inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold",
            "border border-border bg-background text-foreground hover:bg-muted",
            !props.enabled ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          + Add dependent
        </button>
      </div>

      {/* keep mounted; no jump */}
      <div className="mt-3">
        {!props.enabled ? (
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">
              Select <span className="font-semibold text-foreground">Yes</span>{" "}
              above to add dependents.
            </p>
          </div>
        ) : props.dependents.length === 0 ? (
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">
              Click{" "}
              <span className="font-semibold text-foreground">
                “Add dependent”
              </span>{" "}
              to enter dependent details.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {props.dependents.map((dep, idx) => (
              <DependentCard
                key={dep.clientId}
                index={idx}
                value={dep}
                canRemove={props.dependents.length > 1}
                onRemove={() => props.onRemove(dep.clientId)}
                onChange={(patch) => props.onChange(dep.clientId, patch)}
              />
            ))}

            {props.dependentsCount && Number(props.dependentsCount) > 0 ? (
              <p className="text-xs text-muted-foreground">
                You entered{" "}
                <span className="font-semibold text-foreground">
                  {props.dependentsCount}
                </span>{" "}
                dependents. You currently added{" "}
                <span className="font-semibold text-foreground">
                  {props.dependents.length}
                </span>
                .
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function DependentCard(props: {
  index: number;
  value: DependentInput;
  onChange: (patch: Partial<DependentInput>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const i = props.index + 1;
  const v = props.value;

  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Dependent #{i}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            SSN is required for dependents you plan to claim.
          </p>
        </div>

        <button
          type="button"
          onClick={props.onRemove}
          disabled={!props.canRemove}
          className={[
            "inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold",
            "border border-border bg-background text-foreground hover:bg-muted",
            !props.canRemove ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          Remove
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            First name *
          </label>
          <input
            value={v.firstName}
            onChange={(e) => props.onChange({ firstName: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            placeholder="First"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Middle name
          </label>
          <input
            value={v.middleName}
            onChange={(e) => props.onChange({ middleName: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            placeholder="Middle (optional)"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Last name *
          </label>
          <input
            value={v.lastName}
            onChange={(e) => props.onChange({ lastName: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            placeholder="Last"
            required
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Date of birth *
          </label>
          <input
            type="date"
            value={v.dob}
            onChange={(e) => props.onChange({ dob: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Relationship *
          </label>
          <select
            value={v.relationship}
            onChange={(e) => props.onChange({ relationship: e.target.value })}
            className={[
              "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring",
              v.relationship ? "text-foreground" : "text-muted-foreground",
            ].join(" ")}
            required
          >
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === ""}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Dependent SSN *
          </label>
          <input
            value={v.ssn}
            onChange={(e) => props.onChange({ ssn: formatSSN(e.target.value) })}
            inputMode="numeric"
            placeholder="123-45-6789"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            required
          />
        </div>
      </div>
    </div>
  );
}
