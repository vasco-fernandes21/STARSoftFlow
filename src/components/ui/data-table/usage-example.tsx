"use client";

import { useState } from "react";
import { DataTable } from "./data-table";
import { colunasProjetos } from "./columns";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

// Dados de exemplo
const dadosExemplo = [
  {
    id: "1",
    nome: "Website Institucional",
    responsavel: "João Silva",
    status: "em_andamento",
    progresso: 75,
    dataCriacao: "2023-06-15",
  },
  {
    id: "2",
    nome: "Aplicativo Mobile",
    responsavel: "Maria Oliveira",
    status: "pendente",
    progresso: 30,
    dataCriacao: "2023-08-22",
  },
  {
    id: "3",
    nome: "Dashboard Analytics",
    responsavel: "Pedro Santos",
    status: "concluido",
    progresso: 100,
    dataCriacao: "2023-05-10",
  },
  {
    id: "4",
    nome: "E-commerce",
    responsavel: "Ana Souza",
    status: "em_andamento",
    progresso: 60,
    dataCriacao: "2023-07-05",
  },
  {
    id: "5",
    nome: "CRM",
    responsavel: "Carlos Mendes",
    status: "pendente",
    progresso: 15,
    dataCriacao: "2023-09-01",
  },
];

// Definição das opções de filtro
const statusOptions = [
  { id: "1", label: "Todos", value: "todos" },
  { id: "2", label: "Em andamento", value: "em_andamento" },
  { id: "3", label: "Concluído", value: "concluido" },
  { id: "4", label: "Pendente", value: "pendente" },
];

const responsavelOptions = [
  { id: "1", label: "Todos", value: "todos" },
  { id: "2", label: "João Silva", value: "João Silva" },
  { id: "3", label: "Maria Oliveira", value: "Maria Oliveira" },
  { id: "4", label: "Pedro Santos", value: "Pedro Santos" },
  { id: "5", label: "Ana Souza", value: "Ana Souza" },
  { id: "6", label: "Carlos Mendes", value: "Carlos Mendes" },
];

export function ExemploDaTabela() {
  // Estado para pesquisa
  const [pesquisa, setPesquisa] = useState("");
  
  // Estado para filtros
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  
  // Estado para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  // Configurações dos filtros
  const filterConfigs = [
    {
      id: "status",
      label: "Status",
      options: statusOptions,
      value: filtroStatus,
      onChange: setFiltroStatus,
    },
    {
      id: "responsavel",
      label: "Responsável",
      options: responsavelOptions,
      value: filtroResponsavel,
      onChange: setFiltroResponsavel,
    },
  ];
  
  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setPesquisa("");
    setFiltroStatus("todos");
    setFiltroResponsavel("todos");
  };
  
  // Filtragem de dados manualmente (pode ser substituída por filtros do TanStack)
  const dadosFiltrados = dadosExemplo.filter(item => {
    // Aplicar filtro de pesquisa
    const matchPesquisa = 
      pesquisa === "" || 
      item.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      item.responsavel.toLowerCase().includes(pesquisa.toLowerCase());
    
    // Aplicar filtro de status
    const matchStatus = 
      filtroStatus === "todos" || 
      item.status === filtroStatus;
    
    // Aplicar filtro de responsável
    const matchResponsavel = 
      filtroResponsavel === "todos" || 
      item.responsavel === filtroResponsavel;
    
    return matchPesquisa && matchStatus && matchResponsavel;
  });
  
  // Botão de ação para criar novo projeto
  const botaoAcao = (
    <Button className="rounded-full bg-azul hover:bg-azul/90">
      <PlusCircle className="h-4 w-4 mr-2" />
      Novo Projeto
    </Button>
  );
  
  return (
    <DataTable
      columns={colunasProjetos}
      data={dadosFiltrados}
      title="Projetos"
      subtitle="Gerencie todos os projetos da sua empresa"
      actionButton={botaoAcao}
      searchPlaceholder="Pesquisar projetos..."
      filterConfigs={filterConfigs}
      initialPageSize={5}
      onClearFilters={limparFiltros}
      onRowClick={(row) => console.log("Projeto clicado:", row.nome)}
      emptyStateMessage={{
        title: "Nenhum projeto encontrado",
        description: "Tente ajustar os filtros ou criar um novo projeto."
      }}
      // Para demonstrar como seria com paginação do servidor:
      // serverSidePagination={{
      //   totalItems: dadosFiltrados.length,
      //   pageCount: Math.ceil(dadosFiltrados.length / 5),
      //   pageIndex: paginaAtual,
      //   pageSize: 5,
      //   onPageChange: setPaginaAtual,
      // }}
    />
  );
} 