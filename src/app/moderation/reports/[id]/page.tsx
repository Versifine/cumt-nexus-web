import type { Metadata } from "next";

import { ModerationReportDetail } from "@/features/moderation/moderation-console";

type ModerationReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: ModerationReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const shortId = id.slice(0, 8).replace(/-+$/, "");

  return {
    title: `举报 ${shortId} | CUMT Nexus`,
    description: "查看举报详情、目标预览并执行审核处理。",
  };
}

export default async function ModerationReportRoute({
  params,
}: ModerationReportPageProps) {
  const { id } = await params;

  return <ModerationReportDetail id={id} />;
}
