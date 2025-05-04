import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { RootLayoutContent } from "@/layouts/root-layout-content";
import { SessionProvider } from "next-auth/react";

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
            <RootLayoutContent>{children}</RootLayoutContent>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
