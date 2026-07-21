import { redirect } from "next/navigation";

// Source management is now folded into each park's Research workspace instead of a
// standalone destination. Deep links with ?parkId= route straight to that park's workspace;
// otherwise land on the Research park list.
export default async function SourcesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ parkId?: string }>;
}) {
  const { parkId } = await searchParams;
  if (parkId) {
    redirect(`/admin/ai-research/research/${parkId}`);
  }
  redirect("/admin/ai-research/research");
}
