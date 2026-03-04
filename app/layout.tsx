import type { Metadata } from "next";
import { Nunito, Syne } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Janaki Guru Enterprises – HI-FI Stationery",
  description: "Order stationery, school & office supplies with fast local delivery within 10 km.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${syne.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}