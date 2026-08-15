import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SameSailing",
    short_name: "SameSailing",
    description:
      "Discover travelers on your exact cruise. Plan dinners, find playmates for the kids, share a shore excursion - all before you board.",
    start_url: "/",
    display: "standalone",
    background_color: "#e4f3f4",
    theme_color: "#0e8c99",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
