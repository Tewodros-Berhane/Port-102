import { PageContainer } from "@/components/common/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-5 h-80" />
    </PageContainer>
  );
}
