import "@/styles/globals.css";
import { Toaster } from 'sonner';

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { RootLayoutContent } from "@/layouts/root-layout-content";
import { SessionProvider } from "next-auth/react";

export const defaultConfig = {
  prefetch: true,
};

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
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(44, 86, 151, 0.1)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
              color: '#2C5697',
              borderRadius: '12px',
              fontSize: '0.925rem',
              padding: '16px',
            },
            className: 'sonner-toast-custom',
            success: {
              style: {
                backgroundColor: 'rgba(236, 253, 245, 0.98)',
                border: '1px solid rgba(6, 95, 70, 0.1)',
                color: '#065F46',
              },
            },
            error: {
              style: {
                backgroundColor: 'rgba(254, 242, 242, 0.98)',
                border: '1px solid rgba(153, 27, 27, 0.1)',
                color: '#991B1B',
              },
            },
            actionButton: {
              style: {
                backgroundColor: '#2C5697',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }
            },
            cancelButton: {
              style: {
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.875rem',
                fontWeight: '500',
              },
            },
            duration: 5000,
          }}
          richColors={false}
        />
      </body>
    </html>
  );
}
