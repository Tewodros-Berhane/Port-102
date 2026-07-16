import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export function StatCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-t-border-strong", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-foreground-subtle">
            {label}
          </p>
          {icon && <div className="text-primary">{icon}</div>}
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        {detail && (
          <div className="mt-2 text-xs text-foreground-muted">{detail}</div>
        )}
      </CardContent>
    </Card>
  );
}
