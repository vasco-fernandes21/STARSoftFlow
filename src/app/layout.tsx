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
      <head>
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head>
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
            classNames: {
              success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
              error: 'bg-red-50 border-red-100 text-red-800',
              warning: 'bg-amber-50 border-amber-100 text-amber-800',
              info: 'bg-blue-50 border-blue-100 text-blue-800',
              actionButton: 'bg-azul text-white border-0 rounded-md px-3 py-2 text-sm font-medium cursor-pointer',
              cancelButton: 'bg-gray-100 text-gray-600 border-0 rounded-md px-3 py-2 text-sm font-medium',
            },
            duration: 5000,
          }}
          richColors={false}
        />
      </body>
    </html>
  );
}
