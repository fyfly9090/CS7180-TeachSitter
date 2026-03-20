import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeachSitter",
  description: "Connect preschool parents with teachers for trusted childcare during school breaks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
