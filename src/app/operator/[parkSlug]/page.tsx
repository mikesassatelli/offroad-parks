import { redirect } from "next/navigation";

interface OperatorIndexPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorIndexPage({ params }: OperatorIndexPageProps) {
  const { parkSlug } = await params;
  redirect(`/operator/${parkSlug}/dashboard`);
}
