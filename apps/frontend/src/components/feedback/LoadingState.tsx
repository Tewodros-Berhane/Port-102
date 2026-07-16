import { LoaderCircle } from "lucide-react";
export function LoadingState({ label = "Loading…" }: { label?: string }) { return <div className="flex items-center gap-2 py-3 text-sm text-foreground-muted" role="status"><LoaderCircle className="size-4 animate-spin text-primary"/>{label}</div>; }
