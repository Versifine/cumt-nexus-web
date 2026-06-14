export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => [...authQueryKeys.all, "me"] as const,
  security: () => [...authQueryKeys.all, "security"] as const,
};
