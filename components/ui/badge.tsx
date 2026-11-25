import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Square, small-caps marks in the margin. State colors (ok, warn, bad) mark state only.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-none border px-1.5 py-0 text-xs font-semibold [font-variant-caps:all-small-caps] tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-foreground text-foreground",
        ok: "border-ok text-ok",
        warn: "border-warn text-warn",
        destructive: "border-bad text-bad",
      },
    },
    defaultVariants: { variant: "outline" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
