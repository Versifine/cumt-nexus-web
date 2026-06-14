import type { QueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "./query-keys";
import type { AuthResult } from "./types";

type SyncAuthenticatedSessionInput = {
  queryClient: QueryClient;
  result: AuthResult;
  setToken: (token: string) => void;
};

export async function syncAuthenticatedSession({
  queryClient,
  result,
  setToken,
}: SyncAuthenticatedSessionInput) {
  setToken(result.access_token);
  queryClient.setQueryData(authQueryKeys.me(), result.user);

  await queryClient.invalidateQueries({
    queryKey: authQueryKeys.me(),
  });
}
