"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
function TooltipProvider({ delayDuration = 300, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) { return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props}/>; }
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) { return <TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={sideOffset} className={cn("z-50 rounded-sm bg-foreground px-2.5 py-1.5 text-xs text-background shadow-overlay animate-in fade-in-0 zoom-in-95", className)} {...props}>{children}<TooltipPrimitive.Arrow className="fill-foreground"/></TooltipPrimitive.Content></TooltipPrimitive.Portal>; }
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
