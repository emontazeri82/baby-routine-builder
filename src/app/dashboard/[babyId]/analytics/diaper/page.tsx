import DiaperAnalyticsClient from "./DiaperAnalyticsClient";

interface PageProps {
  params: Promise<{ babyId: string }>;
}

export default async function DiaperAnalyticsPage({
  params,
}: PageProps) {
  const { babyId } = await params;

  return <DiaperAnalyticsClient babyId={babyId} />;
}


