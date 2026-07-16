"use client";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
export default function Error({ error }: { error: Error }) {
  return <QueryErrorState error={error} />;
}
