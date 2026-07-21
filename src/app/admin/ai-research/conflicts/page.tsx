import { redirect } from "next/navigation";

// Field conflicts are now surfaced inline within the Review tab (multiple pending
// proposals for the same field are shown side by side), so this standalone route redirects there.
export default function ConflictsRedirectPage() {
  redirect("/admin/ai-research/review");
}
