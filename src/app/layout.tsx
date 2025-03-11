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
        <Toaster
          position="top-center"
          theme="light"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #2C5697',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              color: '#2C5697',
              borderRadius: '12px',
            },
            className: 'sonner-toast-custom',
          }}
        />
      </body>
    </html>
  );
}
