"use client";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
export default function RouteError({ error }: { error: Error }) {
  return (
    <div className="p-6">
      <QueryErrorState error={error} />
    </div>
  );
}
