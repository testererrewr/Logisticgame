import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://playloadstar.com"),
  title: "Loadstar — Dein weltweites Frachtnetz",
  description: "Loadstar: Online-Logistikspiel mit echten Unternehmen, gemeinsamer Weltzeit, eigenen Speditionen und Allianzen.",
  applicationName: "Loadstar",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {title: "Loadstar", description: "Baue dein weltweites Frachtnetz – mit echten Unternehmen auf der echten Weltkarte.", url: "https://playloadstar.com", siteName: "Loadstar", images: ["/og-image.png"], type: "website"},
  twitter: {card: "summary_large_image", title: "Loadstar", images: ["/og-image.png"]},
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101c2a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
