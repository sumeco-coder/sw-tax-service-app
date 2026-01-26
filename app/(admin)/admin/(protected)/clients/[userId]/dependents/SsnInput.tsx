"use client";

import * as React from "react";

function formatSsnLive(value: string) {
  const d = String(value ?? "").replace(/\D/g, "").slice(0, 9);
  const a = d.slice(0, 3);
  const b = d.slice(3, 5);
  const c = d.slice(5, 9);

  if (d.length <= 3) return a;
  if (d.length <= 5) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "defaultValue"
> & {
  name: string;
  defaultValue?: string | null; // can be digits or formatted
};

export default function SsnInput({ name, defaultValue, ...rest }: Props) {
  const [val, setVal] = React.useState(() => formatSsnLive(String(defaultValue ?? "")));

  return (
    <input
      {...rest}
      name={name}
      value={val}
      onChange={(e) => setVal(formatSsnLive(e.target.value))}
      inputMode="numeric"
      autoComplete="off"
      placeholder={rest.placeholder ?? "SSN (###-##-####)"}
      maxLength={11}
    />
  );
}
