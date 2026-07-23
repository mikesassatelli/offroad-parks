import { redirect } from "next/navigation";

// Map hero backfill now lives as a section on the Photos tab.
export default function AdminMapHeroesPage() {
  redirect("/admin/photos");
}
