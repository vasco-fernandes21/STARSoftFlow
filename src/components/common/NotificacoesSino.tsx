"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificacoes } from "@/components/providers/NotificacoesProvider";
import { Badge } from "@/components/ui/badge";

export function NotificacoesSino() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { notificacoes, naoLidas, marcarComoLida } = useNotificacoes();

  // Pegar apenas as 5 notificações mais recentes não arquivadas
  const notificacoesRecentes = notificacoes
    .filter((n) => n.estado !== "ARQUIVADA")
    .slice(0, 5);

  const handleNotificacaoClick = async (id: string, entidade: string, entidadeId: string) => {
    await marcarComoLida(id);
    setOpen(false);

    // Navegar para a entidade correspondente
    switch (entidade) {
      case "PROJETO":
        router.push(`/projetos/${entidadeId}`);
        break;
      case "WORKPACKAGE":
        router.push(`/projetos/${entidadeId}/workpackages`);
        break;
      case "ENTREGAVEL":
        router.push(`/projetos/entregaveis/${entidadeId}`);
        break;
      case "TAREFA":
        router.push(`/projetos/tarefas/${entidadeId}`);
        break;
      case "ALOCACAO":
        router.push(`/utilizadores/${entidadeId}`);
        break;
      default:
        router.push("/notificacoes");
    }
  };

  const handleVerTodas = () => {
    setOpen(false);
    router.push("/notificacoes");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-slate-500 shadow-sm transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/5 hover:text-azul hover:shadow"
        >
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            >
              {naoLidas > 99 ? "99+" : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="mt-2 w-80 rounded-xl border-none bg-white/80 p-2 shadow-2xl backdrop-blur-lg"
      >
        <div className="mb-2 px-2 py-1.5">
          <h3 className="text-sm font-semibold text-slate-900">Notificações</h3>
          <p className="text-xs text-slate-500">
            {naoLidas} {naoLidas === 1 ? "não lida" : "não lidas"}
          </p>
        </div>

        <ScrollArea className="h-[min(calc(5*5rem),calc(100vh-15rem))]">
          {notificacoesRecentes.length > 0 ? (
            notificacoesRecentes.map((notificacao) => (
              <DropdownMenuItem
                key={notificacao.id}
                className={cn(
                  "mb-1 flex cursor-pointer flex-col gap-1 rounded-lg p-3 text-left",
                  notificacao.estado === "NAO_LIDA"
                    ? "bg-azul/5 hover:bg-azul/10"
                    : "hover:bg-slate-50"
                )}
                onClick={() =>
                  handleNotificacaoClick(
                    notificacao.id,
                    notificacao.entidade,
                    notificacao.entidadeId
                  )
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "line-clamp-2 text-sm",
                      notificacao.estado === "NAO_LIDA"
                        ? "font-semibold text-slate-900"
                        : "text-slate-700"
                    )}
                  >
                    {notificacao.titulo}
                  </p>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {format(new Date(notificacao.dataEmissao), "dd/MM/yy HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-slate-500">{notificacao.descricao}</p>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-4 text-center">
              <p className="text-sm text-slate-500">Nenhuma notificação recente</p>
            </div>
          )}
        </ScrollArea>

        <Button
          variant="ghost"
          className="mt-2 w-full justify-center rounded-lg font-medium text-azul hover:bg-azul/5"
          onClick={handleVerTodas}
        >
          Ver todas as notificações
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 