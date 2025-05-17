import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { RootLayoutContent } from "@/layouts/root-layout-content";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AlertDialogProvider } from "@/components/ui/alert-dialog/alert-dialog-provider";
import { NotificacoesProvider } from "@/components/providers/NotificacoesProvider";
import { ProjetoFormProvider } from "@/components/projetos/criar/ProjetoFormContext";

// Configurar Inter
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter", // Variável CSS para Inter
});

export const metadata: Metadata = {
  title: "STARSoftFlow",
  description: "Gestão simplificada de projetos de software",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <SessionProvider
          refetchInterval={5 * 60}
          refetchOnWindowFocus={true}
        >
          <TRPCReactProvider>
            <AlertDialogProvider>
              <NotificacoesProvider>
                <ProjetoFormProvider>
                  <RootLayoutContent>{children}</RootLayoutContent>
                </ProjetoFormProvider>
              </NotificacoesProvider>
            </AlertDialogProvider>
          </TRPCReactProvider>
        </SessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
