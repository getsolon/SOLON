import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solon — Your Own AI Agent Server",
  description:
    "Deploy AI agents on dedicated hardware. Bring your own API keys or run open-source models on NVIDIA GPUs. No DevOps required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
