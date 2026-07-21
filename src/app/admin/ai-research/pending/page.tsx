import { redirect } from "next/navigation";

// The old "Review Queue"/"pending" route now lives under the clearer "Review" tab.
export default function PendingRedirectPage() {
  redirect("/admin/ai-research/review");
}
