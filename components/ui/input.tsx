import * as React from "react";
import { cn } from "@/lib/utils";

// Ruled-line field: a single hairline under the value, like a form printed on paper.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-none border-0 border-b border-input bg-transparent px-0.5 py-1 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        type === "range" && "h-6 cursor-pointer border-0 px-0 accent-primary",
        type === "file" &&
          "h-auto cursor-pointer border-0 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-none file:border file:border-foreground file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary",
        className
      )}
      {...props}
    />
  );
}

export { Input };
