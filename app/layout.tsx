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
  title: "Janaki Guru Enterprises - Stationery Store | Thoothukudi",
  description: "Order stationery, pencils, notebooks, school & office supplies online from Janaki Guru Enterprises. Fast local delivery within 10 km in Thoothukudi.",
  keywords: "janaki guru enterprises, stationery store thoothukudi, pencils notebooks tuticorin, school supplies",
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
