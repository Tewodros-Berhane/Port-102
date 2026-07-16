import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, type, ...props }: React.ComponentProps<"input">) { return <input type={type} data-slot="input" className={cn("h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-foreground-subtle focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20", className)} {...props}/>; }
export { Input };
