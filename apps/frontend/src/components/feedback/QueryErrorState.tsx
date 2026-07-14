export function QueryErrorState({ message = "This information could not be loaded." }: { message?: string }) { return <div className="state state-error" role="alert">{message}</div>; }
