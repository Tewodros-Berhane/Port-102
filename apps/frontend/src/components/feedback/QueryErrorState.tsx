import { CircleAlert } from "lucide-react";
import { getApiErrorMessage } from "@/lib/errors";
export function QueryErrorState({ error, message = "This information could not be loaded." }: { error?: unknown; message?: string }) { return <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive-subtle px-3 py-2.5 text-sm text-destructive-foreground" role="alert"><CircleAlert className="mt-0.5 size-4 shrink-0"/>{getApiErrorMessage(error, message)}</div>; }
