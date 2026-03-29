import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// POST /api/admin/photos/bulk-upload - Upload multiple photos for parks
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();

    const mappings = JSON.parse(formData.get("mappings") as string) as Array<{
      parkId: string;
      fileIndex: number;
      caption?: string;
    }>;

    const files = formData.getAll("files") as File[];

    if (!files.length || !mappings.length) {
      return NextResponse.json(
        { error: "No files or mappings provided" },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    const results: Array<{ parkId: string; success: boolean; error?: string }> = [];

    for (const mapping of mappings) {
      const file = files[mapping.fileIndex];

      if (!file) {
        results.push({ parkId: mapping.parkId, success: false, error: "File not found" });
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        results.push({
          parkId: mapping.parkId,
          success: false,
          error: `Invalid file type: ${file.type}`,
        });
        continue;
      }

      if (file.size > maxSize) {
        results.push({
          parkId: mapping.parkId,
          success: false,
          error: "File exceeds 5MB limit",
        });
        continue;
      }

      try {
        const blob = await put(
          `parks/${mapping.parkId}/${Date.now()}-${file.name}`,
          file,
          { access: "public" },
        );

        // Guard against duplicate URLs — skip if this blob URL is already recorded
        const existing = await prisma.parkPhoto.findUnique({
          where: { url: blob.url },
        });
        if (!existing) {
          await prisma.parkPhoto.create({
            data: {
              parkId: mapping.parkId,
              userId: session.user.id,
              url: blob.url,
              caption: mapping.caption || null,
              status: "APPROVED",
            },
          });
        }

        results.push({ parkId: mapping.parkId, success: true });
      } catch (error) {
        console.error(`Failed to upload photo for park ${mapping.parkId}:`, error);
        results.push({
          parkId: mapping.parkId,
          success: false,
          error: "Upload failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      uploaded: successCount,
      errors: errorCount,
      results,
    });
  } catch (error) {
    console.error("Bulk photo upload failed:", error);
    return NextResponse.json(
      { error: "Bulk photo upload failed" },
      { status: 500 },
    );
  }
}
