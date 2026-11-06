import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weltverbund Logistik — Dein weltweites Frachtnetz",
  description: "Online-Logistikwelten mit gemeinsamer Spielzeit, eigenen Speditionen und freiwilliger Kooperation.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
