export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => [...authQueryKeys.all, "me"] as const,
  points: () => [...authQueryKeys.all, "points"] as const,
  security: () => [...authQueryKeys.all, "security"] as const,
};
