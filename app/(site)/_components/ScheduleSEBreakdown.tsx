"use client";

import WhyTooltip from "./WhyTooltip";

export default function ScheduleSEBreakdown(props: any) {
  return (
    <div className="border rounded-xl p-4 space-y-2">
      <h3 className="font-semibold">
        Schedule SE Breakdown
      </h3>

      <Row
        label={
          <>
            Net earnings (92.35%)
            <WhyTooltip text="IRS adjustment for self-employment tax." />
          </>
        }
        value={props.netEarnings}
      />

      <Row label="Social Security tax" value={props.ssTax} />
      <Row label="Medicare tax" value={props.medicareTax} />

      {props.additionalMedicareTax > 0 && (
        <Row
          label="Additional Medicare tax"
          value={props.additionalMedicareTax}
        />
      )}

      <Row
        label="Total SE tax"
        value={props.seTax}
        strong
      />
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: React.ReactNode;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        strong ? "font-semibold" : ""
      }`}
    >
      <span>{label}</span>
      <span>${value.toFixed(2)}</span>
    </div>
  );
}
