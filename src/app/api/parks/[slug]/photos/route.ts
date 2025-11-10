import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

// POST /api/parks/[slug]/photos - Upload a photo
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Find the park by slug
  const park = await prisma.park.findUnique({
    where: { slug },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Upload to Vercel Blob
    const blob = await put(
      `parks/${park.id}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
      },
    );

    // Check if user is admin
    const userRole = (session.user as { role?: string })?.role;
    const isAdmin = userRole === "ADMIN";

    // Create photo record in database
    const photo = await prisma.parkPhoto.create({
      data: {
        parkId: park.id,
        userId: session.user.id,
        url: blob.url,
        caption: caption || null,
        status: isAdmin ? "APPROVED" : "PENDING", // Auto-approve for admins
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      photo,
      message: isAdmin
        ? "Photo uploaded successfully"
        : "Photo uploaded and pending approval",
    });
  } catch (error) {
    console.error("Failed to upload photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 },
    );
  }
}
