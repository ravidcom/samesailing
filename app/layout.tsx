import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Providers } from "./providers";

// Only set in Production's Vercel env, so local dev and staging Preview
// deployments never report traffic into the real analytics property.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_DESCRIPTION =
  "Discover travelers on your exact cruise. Plan dinners, find playmates for the kids, share a shore excursion - all before you board.";

export const metadata: Metadata = {
  metadataBase: new URL("https://samesailing.com"),
  title: {
    default: "SameSailing.com - Meet your fellow cruise passengers",
    // Child pages set only their own part via generateMetadata's `title`;
    // this appends the site name so every tab/search result stays branded.
    template: "%s | SameSailing",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "SameSailing.com",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "SameSailing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SameSailing.com",
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "SameSailing",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e8c99",
};

// Organization + WebSite structured data, site-wide - this is what tells
// Google "SameSailing" is the name of a specific entity (not just a phrase
// in a title tag), which is what branded search results and sitelinks are
// actually keyed off, not on-page copy alone.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SameSailing",
  alternateName: "SameSailing.com",
  url: "https://samesailing.com",
  logo: "https://samesailing.com/icons/512",
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SameSailing",
  url: "https://samesailing.com",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable}`}>
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
        <Providers>{children}</Providers>
        {GA_MEASUREMENT_ID ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
      </body>
    </html>
  );
}
