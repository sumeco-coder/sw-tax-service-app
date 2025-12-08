// components/ui/primary-button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils"; // or your own cn helper

interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function PrimaryButton({
  className,
  asChild,
  ...props
}: PrimaryButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "rounded-lg px-4 py-2 text-sm font-medium",
        "text-primary-foreground",
        "bg-[linear-gradient(90deg,#f00067,#4a0055)]",
        "shadow-sm shadow-pink-500/30",
        "transition-all duration-200",
        "hover:brightness-110 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
