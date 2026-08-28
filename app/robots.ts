import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind these routes is useful to index - auth-gated
      // dashboards/chat/admin, or a page that just redirects into a form.
      disallow: ["/dashboard", "/profile", "/chat", "/admin", "/join", "/login"],
    },
    sitemap: "https://samesailing.com/sitemap.xml",
  };
}
