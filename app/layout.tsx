import type { Metadata } from "next";
import { Noto_Sans_KR, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/Toast";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Moneger - 스마트한 가계부",
  description: "머니플로우로 간편하게 관리하는 가계부 서비스",
  verification: {
    google: "HLbX_4Syh6kD_uuV07IHVQMAj7QKDzRv-Nx26eootXM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${notoSansKR.variable} ${spaceMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
