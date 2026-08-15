import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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

export const metadata: Metadata = {
  title: "SameSailing.com",
  description:
    "Discover travelers on your exact cruise. Plan dinners, find playmates for the kids, share a shore excursion - all before you board.",
  appleWebApp: {
    capable: true,
    title: "SameSailing",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e8c99",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable}`}>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
