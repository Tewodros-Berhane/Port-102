"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
function SheetContent({ className, children, side = "left", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"/><DialogPrimitive.Content className={cn("fixed inset-y-0 z-50 w-[290px] bg-sidebar text-sidebar-foreground shadow-overlay outline-none data-[state=open]:animate-in data-[state=closed]:animate-out", side === "left" ? "left-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left" : "right-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right", className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm p-2 text-sidebar-muted hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"><X className="size-4"/><span className="sr-only">Close</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>; }
const SheetTitle = DialogPrimitive.Title;
const SheetDescription = DialogPrimitive.Description;
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
