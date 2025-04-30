import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import AdminDashboardPage from "@/app/(dashboard)/admin/page";
import GestorDashboardPage from "@/app/(dashboard)/gestor/page";
import UserDashboardPage from "@/app/(dashboard)/utilizador/page";

export default async function RootPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  // Cast explícito para aceder à permissao
  const userPermission = (session.user as any).permissao || "COMUM";
  const isAdmin = userPermission === "ADMIN";
  const isGestor = userPermission === "GESTOR" || userPermission === "ADMIN";

  if (isAdmin) {
    return <AdminDashboardPage />;
  } else if (isGestor) {
    return <GestorDashboardPage />;
  } else {
    return <UserDashboardPage />;
  }
}
