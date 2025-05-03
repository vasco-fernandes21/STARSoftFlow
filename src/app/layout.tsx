import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { RootLayoutContent } from "@/layouts/root-layout-content";
import { SessionProvider } from "next-auth/react";
import { NotificacoesProvider } from "@/components/providers/NotificacoesProvider";

// Initialize Inter font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "STAR Institute",
  description: "Sistema de Gestão de Projetos",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={inter.variable}>
      <body className="font-sans antialiased">
        <SessionProvider
          refetchInterval={5 * 60} // Refetch session every 5 minutes
          refetchOnWindowFocus={true} // Refetch session when window is focused
        >
          <TRPCReactProvider>
            <NotificacoesProvider>
              <RootLayoutContent>{children}</RootLayoutContent>
            </NotificacoesProvider>
            <Toaster />
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
