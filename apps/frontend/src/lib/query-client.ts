import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./errors";

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: (count, error) => error instanceof ApiError && [401, 403].includes(error.status) ? false : count < 2 }, mutations: { retry: false } } });
}
