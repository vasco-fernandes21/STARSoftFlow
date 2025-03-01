import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

// Rotas que não requerem autenticação
const rotasPublicas = ["/login", "/primeiro-login"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  
  // Verifica se a rota atual é pública
  const isPublicRoute = rotasPublicas.some(route => 
    path === route || path.startsWith(`${route}/`)
  );

  // Se o utilizador não estiver autenticado e a rota não for pública,
  // redireciona para a página de login
  if (!isLoggedIn && !isPublicRoute) {
    // Guarda a URL original para redirecionar de volta após o login
    const returnUrl = encodeURIComponent(req.nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/login?returnUrl=${returnUrl}`, req.nextUrl.origin)
    );
  }

  // Se o utilizador estiver autenticado e estiver na página de login,
  // redireciona para a página inicial (a menos que seja o primeiro login)
  if (isLoggedIn && path === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Em todos os outros casos, continua normalmente
  return NextResponse.next();
});

// Configuração para especificar em quais caminhos o middleware deve ser executado
export const config = {
  matcher: [
    // Aplica a todas as rotas exceto as que começam com:
    "/((?!api|_next|public|images|favicon.ico).*)",
  ],
};