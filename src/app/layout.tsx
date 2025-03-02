import "@/styles/globals.css";
import { Toaster } from 'sonner';

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { RootLayoutContent } from "@/layouts/root-layout-content";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "STARSoftFlow",
  description: "Sistema de Gestão Interna de Projetos",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`${GeistSans.variable}`}>
      <body>
        <SessionProvider>
          <TRPCReactProvider>
            <RootLayoutContent>{children}</RootLayoutContent>
          </TRPCReactProvider>
        </SessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
