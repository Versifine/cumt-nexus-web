import { getApiBaseUrl } from "@/lib/api/client";

const BACKEND_HEALTH_TIMEOUT_MS = 3_000;

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
  const url = new URL("/healthz", getApiBaseUrl()).toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, BACKEND_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.ok) {
      return {
        status: "ok",
        url,
      };
    }

    return {
      message: `backend health check returned ${response.status}`,
      status: "unavailable",
      url,
    };
  } catch {
    return {
      message: "backend health check is not reachable",
      status: "unavailable",
      url,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
