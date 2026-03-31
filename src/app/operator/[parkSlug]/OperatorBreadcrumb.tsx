"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface OperatorBreadcrumbProps {
  parkName: string;
  parkSlug: string;
}

export function OperatorBreadcrumb({ parkName, parkSlug }: OperatorBreadcrumbProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  if (from === "park") {
    return (
      <Link
        href={`/parks/${parkSlug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {parkName}
      </Link>
    );
  }

  return (
    <Link
      href="/operator"
      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      Manage Parks
    </Link>
  );
}
