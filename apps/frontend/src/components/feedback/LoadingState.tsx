export function LoadingState({ label = "Loading…" }: { label?: string }) { return <div className="state" role="status">{label}</div>; }
