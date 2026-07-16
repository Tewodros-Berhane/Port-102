import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide", { variants: { variant: { neutral: "bg-muted text-foreground-muted", success: "bg-success-subtle text-success-foreground", warning: "bg-warning-subtle text-warning-foreground", destructive: "bg-destructive-subtle text-destructive-foreground", info: "bg-info-subtle text-info-foreground", primary: "bg-primary-subtle text-primary-subtle-foreground" } }, defaultVariants: { variant: "neutral" } });
function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) { return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}/>; }
export { Badge, badgeVariants };
