import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rotas que não requerem autenticação
const rotasPublicas = ["/login", "/primeiro-login"];

export async function middleware(request: NextRequest) {
  // Verificar token usando o cookie next-auth.session-token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: "next-auth.session-token",
  });

  const isLoggedIn = !!token;
  const path = request.nextUrl.pathname;

  // Verifica se a rota atual é pública
  const isPublicRoute = rotasPublicas.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  console.log(`Path: ${path}, Logged in: ${isLoggedIn}, Public: ${isPublicRoute}`);

  // Se o utilizador não estiver autenticado e a rota não for pública,
  // redireciona para a página de login
  if (!isLoggedIn && !isPublicRoute) {
    // Guarda a URL original para redirecionar de volta após o login
    const returnUrl = encodeURIComponent(path);
    return NextResponse.redirect(new URL(`/login?returnUrl=${returnUrl}`, request.url));
  }

  // Se o utilizador estiver autenticado e estiver na página de login,
  // redireciona para a página inicial
  if (isLoggedIn && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Em todos os outros casos, continua normalmente
  return NextResponse.next();
}

// Configuração para aplicar o middleware a rotas específicas
export const config = {
  matcher: [
    // Aplica a todas as rotas exceto:
    // 1. Recursos estáticos
    // 2. Rotas de API
    "/((?!_next/static|_next/image|favicon.ico|api/auth|images|public).*)",
  ],
};
