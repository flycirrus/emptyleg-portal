import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import Providers from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HYPE Empty Legs | Private Jet Charter",
  description:
    "Exclusive empty leg flights at unbeatable prices. Luxury private jet travel made accessible.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
