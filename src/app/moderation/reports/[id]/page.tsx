import { redirect } from "next/navigation";

type ModerationReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ModerationReportRoute({
  params,
}: ModerationReportPageProps) {
  const { id } = await params;
  redirect(`/admin/reports/${encodeURIComponent(id)}`);
}
