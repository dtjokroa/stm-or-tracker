import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STM IOM Rental Tracker",
  description: "Track IOM & ICP Monitor rentals and accompanying field staff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
