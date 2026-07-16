import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "destructive"
  | "info";
export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <Badge variant={tone}>
      <Circle className="size-1.5 fill-current" aria-hidden />
      {label}
    </Badge>
  );
}
