import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

import { Providers } from "./providers";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "League Portal",
  description: "League Portal"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
  }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );

}


