import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTS Studio",
  description: "Ubah teks menjadi suara secara instan untuk kebutuhan bahasa Indonesia maupun internasional."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
