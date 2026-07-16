import { MutationCache, QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ApiError } from "./errors";
import { getApiErrorMessage } from "./errors";

export function createQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, variables, _context, mutation) => {
        const successMessage = (
          mutation.options.meta as
            | { successMessage?: string | ((variables: unknown) => string) }
            | undefined
        )?.successMessage;
        const message =
          typeof successMessage === "function"
            ? successMessage(variables)
            : successMessage;
        if (message) toast.success(message);
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (count, error) => {
          if (!(error instanceof ApiError)) return count < 2;
          if (error.status >= 400 && error.status < 500) return false;
          if (error.status === 503) return count < 1;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
