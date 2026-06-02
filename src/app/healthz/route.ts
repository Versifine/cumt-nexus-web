const healthPayload = {
  service: "cumt-nexus-web",
  status: "ok",
} as const;

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(healthPayload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
