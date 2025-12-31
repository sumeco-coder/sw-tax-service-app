"use client";

import type { ReactNode } from "react";

export function RadioPill(props: {
  name: string;
  value: string;
  children: ReactNode;

  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: () => void;

  disabled?: boolean;
  required?: boolean;
}) {
  const isControlled = typeof props.checked === "boolean";

  return (
    <label className="relative">
      <input
        type="radio"
        name={props.name}
        value={props.value}
        className="peer sr-only"
        disabled={props.disabled}
        required={props.required}
        {...(isControlled
          ? { checked: props.checked, onChange: props.onChange }
          : { defaultChecked: props.defaultChecked })}
      />
      <span
        className={[
          "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
          "border border-border bg-background text-foreground",
          "hover:bg-muted",
          "peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary/30",
          "peer-disabled:opacity-60 peer-disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {props.children}
      </span>
    </label>
  );
}

export function QuestionsYesNo(props: {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: "yes" | "no";
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <label className="mb-3 block text-sm font-medium text-foreground">
        {props.label}
      </label>

      <div className="flex flex-wrap gap-2">
        <RadioPill
          name={props.name}
          value="yes"
          disabled={props.disabled}
          defaultChecked={props.defaultValue === "yes"}
          required={props.required} // ✅ required group validation
        >
          Yes
        </RadioPill>

        <RadioPill
          name={props.name}
          value="no"
          disabled={props.disabled}
          defaultChecked={props.defaultValue === "no"}
        >
          No
        </RadioPill>
      </div>
    </div>
  );
}
