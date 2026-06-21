import { createLatestPostsPath, listLatestPosts } from "@/features/post/api";
import { getApiBaseUrl } from "@/lib/api/client";

const BACKEND_HEALTH_TIMEOUT_MS = 3_000;
const BACKEND_READINESS_CHECK = {
  limit: 1,
  offset: 0,
  sort: "new",
  source: "all",
} as const;

type BackendCheck =
  | {
      status: "ok";
      url: string;
    }
  | {
      message: string;
      status: "unavailable";
      url: string;
    };

export const dynamic = "force-dynamic";

export async function GET() {
  const backend = await checkBackend();
  const isReady = backend.status === "ok";

  return Response.json(
    {
      checks: {
        backend,
        frontend: {
          service: "cumt-nexus-web",
          status: "ok",
        },
      },
      service: "cumt-nexus-web",
      status: isReady ? "ready" : "degraded",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: isReady ? 200 : 503,
    },
  );
}

async function checkBackend(): Promise<BackendCheck> {
  const path = createLatestPostsPath(BACKEND_READINESS_CHECK);
  const url = new URL(path, getApiBaseUrl()).toString();

  try {
    await listLatestPosts(
      BACKEND_READINESS_CHECK.limit,
      BACKEND_READINESS_CHECK.offset,
      BACKEND_READINESS_CHECK.sort,
      {
        cache: "no-store",
        fallbackSort: null,
        source: BACKEND_READINESS_CHECK.source,
        timeoutMs: BACKEND_HEALTH_TIMEOUT_MS,
        token: null,
      },
    );

    return {
      status: "ok",
      url,
    };
  } catch {
    return {
      message: "backend public API read is not reachable",
      status: "unavailable",
      url,
    };
  }
}
