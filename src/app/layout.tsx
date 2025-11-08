import "@/app/globals.css";
import type { Metadata } from "next";


export const metadata: Metadata = {
title: "Offroad Parks",
description: "Find UTV‑friendly parks and trails by state, terrain, and amenities.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body className="min-h-screen bg-gray-50">{children}</body>
</html>
);
}