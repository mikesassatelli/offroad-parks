import type { MetadataRoute } from "next";

// Colors derived from the app's earthy off-road palette in globals.css:
//   background_color -> warm cream page background (oklch(0.955 0.008 75))
//   theme_color      -> burnt orange primary accent (oklch(0.58 0.2 38))
//
// NOTE: This is the functional PWA scaffold. Final raster PNG icons
// (192x192 and 512x512, including a dedicated maskable variant) will land
// with the OP-109 brand identity work; for now the vector /icon.svg serves
// all sizes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Offroad Parks",
    short_name: "Offroad Parks",
    description:
      "Discover off-road parks, OHV trails, and riding areas near you — with live closure and weather alerts.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#c1502b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
