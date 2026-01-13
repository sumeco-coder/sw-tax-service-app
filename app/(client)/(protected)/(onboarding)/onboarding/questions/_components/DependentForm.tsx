// app/(client)/(protected)/onboarding/questions/_components/DependentForm.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "stepchild", label: "Stepchild" },
  { value: "fosterChild", label: "Foster child" },
  { value: "grandchild", label: "Grandchild" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "otherRelative", label: "Other relative" },
  { value: "other", label: "Other" },
] as const;

export function DependentForm(props: {
  enabled: boolean;
  dependents: DependentInput[];
  dependentsCount?: string;

  onAdd: () => void;
  onRemove: (clientId: string) => void;
  onChange: (clientId: string, patch: Partial<DependentInput>) => void;
}) {
  return (
    <div className="pt-1 space-y-3">
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

        <Button
          type="button"
          onClick={props.onAdd}
          disabled={!props.enabled}
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          + Add dependent
        </Button>
      </div>

      {!props.enabled ? (
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Select <span className="font-semibold text-foreground">Yes</span>{" "}
              above to add dependents.
            </p>
          </CardContent>
        </Card>
      ) : props.dependents.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Click{" "}
              <span className="font-semibold text-foreground">
                “Add dependent”
              </span>{" "}
              to enter dependent details.
            </p>
          </CardContent>
        </Card>
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
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Dependent #{i}</CardTitle>
            <p className="text-xs text-muted-foreground">
              SSN is required for dependents you plan to claim.
            </p>
          </div>

          <Button
            type="button"
            onClick={props.onRemove}
            disabled={!props.canRemove}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            Remove
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Names */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">First name *</Label>
            <Input
              value={v.firstName}
              onChange={(e) => props.onChange({ firstName: e.target.value })}
              placeholder="First"
              required
              className="rounded-xl"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Middle name</Label>
            <Input
              value={v.middleName}
              onChange={(e) => props.onChange({ middleName: e.target.value })}
              placeholder="Middle (optional)"
              className="rounded-xl"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Last name *</Label>
            <Input
              value={v.lastName}
              onChange={(e) => props.onChange({ lastName: e.target.value })}
              placeholder="Last"
              required
              className="rounded-xl"
              autoComplete="off"
            />
          </div>
        </div>

        {/* DOB / Relationship / SSN */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Date of birth *</Label>
            <Input
              type="date"
              value={v.dob}
              onChange={(e) => props.onChange({ dob: e.target.value })}
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Relationship *</Label>
            <Select
              value={v.relationship || undefined}
              onValueChange={(val) => props.onChange({ relationship: val })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Dependent SSN *</Label>
            <Input
              value={v.ssn}
              onChange={(e) => props.onChange({ ssn: formatSSN(e.target.value) })}
              inputMode="numeric"
              placeholder="123-45-6789"
              required
              className="rounded-xl"
              autoComplete="off"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
