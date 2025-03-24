"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Este é um exemplo de como definir colunas para o componente DataTable
// Você deve criar sua própria versão com os tipos específicos dos seus dados

// Exemplo de tipo de dados
interface Projeto {
  id: string;
  nome: string;
  responsavel: string;
  status: "em_andamento" | "concluido" | "pendente";
  progresso: number;
  dataCriacao: string;
}

// Função para mapear valores de status para exibição visual
const getStatusBadge = (status: Projeto["status"]) => {
  switch (status) {
    case "em_andamento":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">
          Em andamento
        </Badge>
      );
    case "concluido":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
          Concluído
        </Badge>
      );
    case "pendente":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200">
          Pendente
        </Badge>
      );
    default:
      return null;
  }
};

// Componente de barra de progresso
const ProgressBar = ({ valor }: { valor: number }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="bg-azul h-2.5 rounded-full"
        style={{ width: `${valor}%` }}
      ></div>
    </div>
  );
};

// Definição das colunas
export const colunasProjetos: ColumnDef<Projeto>[] = [
  {
    accessorKey: "nome",
    header: ({ column }) => (
      <div className="flex items-center">
        <span>Projeto</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="ml-1 h-6 w-6 rounded-full"
        >
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("nome")}</div>,
  },
  {
    accessorKey: "responsavel",
    header: "Responsável",
    cell: ({ row }) => <div>{row.getValue("responsavel")}</div>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <div className="flex items-center">
        <span>Status</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="ml-1 h-6 w-6 rounded-full"
        >
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "progresso",
    header: "Progresso",
    cell: ({ row }) => {
      const valor = parseInt(row.getValue("progresso"));
      return (
        <div className="w-full max-w-[200px] flex items-center gap-2">
          <ProgressBar valor={valor} />
          <span className="text-xs font-medium">{valor}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "dataCriacao",
    header: ({ column }) => (
      <div className="flex items-center justify-end">
        <span>Data de Criação</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="ml-1 h-6 w-6 rounded-full"
        >
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      // Formatando a data
      const dataCriacao = new Date(row.getValue("dataCriacao"));
      const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(dataCriacao);

      return <div className="text-right">{dataFormatada}</div>;
    },
  },
]; 