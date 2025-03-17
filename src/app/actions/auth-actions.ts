'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/server/auth";

// Lista de todos os cookies relacionados com autenticação
const authCookies = [
  'next-auth.session-token',
  'next-auth.csrf-token',
  'next-auth.callback-url',
  'authjs.session-token',
  'authjs.csrf-token',
  'authjs.callback-url',
  '__Secure-next-auth.session-token',
  'username-localhost-8888'
];

// Função para limpar cookies
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  
  // Limpar todos os cookies de autenticação
  for (const cookieName of authCookies) {
    try {
      cookieStore.delete(cookieName);
      console.log(`Cookie ${cookieName} removido com sucesso`);
    } catch (error) {
      console.error(`Erro ao remover cookie ${cookieName}:`, error);
    }
  }
  
  return { success: true };
}

// Função personalizada de logout
export async function customSignOut(callbackUrl = '/login') {
  try {
    // Primeiro, usar o signOut padrão do NextAuth
    await signOut({ redirect: false });
    
    // Em seguida, limpar manualmente todos os cookies
    await clearAuthCookies();
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
  
  // Redirecionar para a página de login fora do bloco try/catch
  redirect(callbackUrl);
}
