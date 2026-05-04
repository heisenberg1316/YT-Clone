import { cookies } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/theme-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "NewTube",
    description: "NewTube, Video sharing platform",
    icons: {
      icon: "/logo.svg", 
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies(); // 👈 await
  const theme = cookieStore.get("theme")?.value;

  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : ""}
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <ClerkProvider afterSignOutUrl="/">
          <TRPCProvider>
            <ThemeProvider themeValue={theme}>
              <Toaster />
              {children}
            </ThemeProvider>
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
