import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rotas que não requerem autenticação
const rotasPublicas = ["/login", "/primeiro-login", "/recuperar-password"];

// Definição de rotas e roles associadas
const roleRoutes = {
  ADMIN: "/admin",
  GESTOR: "/gestor",
  UTILIZADOR: "/utilizador",
};

// Mapeamento de roles para as páginas que podem aceder
const routePermissions = {
  "/admin": ["ADMIN"],
  "/gestor": ["ADMIN", "GESTOR"],
  "/utilizador": ["ADMIN", "GESTOR", "UTILIZADOR"],
  "/utilizadores": ["ADMIN", "GESTOR"],
};

export async function middleware(request: NextRequest) {
  // Verificar token usando o cookie next-auth.session-token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    cookieName: "next-auth.session-token",
  });

  const isLoggedIn = !!token;
  const userRole = token?.permissao as string | undefined;
  const path = request.nextUrl.pathname;

  // Verifica se a rota atual é pública
  const isPublicRoute = rotasPublicas.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  console.log(
    `Path: ${path}, Sessão Iniciada: ${isLoggedIn}, Permissão: ${userRole}, Pública: ${isPublicRoute}`
  );

  // Se o utilizador não estiver autenticado e a rota não for pública,
  // redireciona para a página de login
  if (!isLoggedIn && !isPublicRoute) {
    const returnUrl = encodeURIComponent(path);
    return NextResponse.redirect(
      new URL(`/login?returnUrl=${returnUrl}`, request.url)
    );
  }

  // Se o utilizador estiver autenticado
  if (isLoggedIn) {
    // Redirecionar da página de login para a dashboard apropriada se já logado
    if (path === "/login") {
      const defaultDashboard = userRole ? roleRoutes[userRole as keyof typeof roleRoutes] || "/" : "/";
      return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }

    // Proteger rotas baseadas em roles
    // Verificar se o path atual é uma rota protegida por role
    const requiredRoles = Object.keys(routePermissions).find(p => path.startsWith(p)) 
                          ? routePermissions[Object.keys(routePermissions).find(p => path.startsWith(p)) as keyof typeof routePermissions] 
                          : null;

    if (requiredRoles) {
      if (!userRole || !requiredRoles.includes(userRole)) {
        console.log(
          `Acesso não autorizado por role ${userRole} a ${path}. A redirecionar.`
        );
        // Redireciona para a dashboard padrão do utilizador ou para uma página de "não autorizado"
        // Por simplicidade, redirecionaremos para a página inicial ou a dashboard padrão do role
        const fallbackUrl = userRole ? roleRoutes[userRole as keyof typeof roleRoutes] || "/" : "/";
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }
    }
  }

  // Em todos os outros casos, continua normalmente
  return NextResponse.next();
}

// Configuração para aplicar o middleware a rotas específicas
export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de pedido, exceto aqueles que começam com:
     * - api (rotas de API)
     * - _next/static (ficheiros estáticos do Next.js)
     * - _next/image (ficheiros de otimização de imagem)
     * - favicon.ico (ficheiro favicon)
     * - Qualquer coisa que pareça um ficheiro (contém um ponto '.')
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
