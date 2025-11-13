import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BulkParkUpload } from "@/components/admin/BulkParkUpload";

export const metadata = {
  title: "Bulk Upload Parks - Admin",
  description: "Upload multiple parks at once via CSV or JSON",
};

export default async function BulkUploadPage() {
  const session = await auth();

  // Require authentication
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Require admin role
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <BulkParkUpload />
    </div>
  );
}
