import type { Metadata } from "next";
import "./globals.css";
import { DimensionInitializer } from "@/components/DimensionInitializer";

export const metadata: Metadata = {
  title: "Board Games",
  description: "Board games and card games display",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full overflow-hidden">
      <body className="h-full w-full overflow-hidden">
        <DimensionInitializer />
        {children}
      </body>
    </html>
  );
}

