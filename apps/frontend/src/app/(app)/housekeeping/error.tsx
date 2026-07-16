"use client";
import { PageContainer } from "@/components/common/PageContainer";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
export default function Error({ error }: { error: Error }) {
  return (
    <PageContainer>
      <QueryErrorState error={error} />
    </PageContainer>
  );
}
