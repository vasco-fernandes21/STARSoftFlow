"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Check, Filter, Package, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Rubrica } from "@prisma/client";
import { useMutations } from "@/hooks/useMutations";

interface ProjetoMateriaisProps {
  projetoId: string;
}

// Mapeamento de rubricas para exibição amigável
const RUBRICA_LABELS: Record<Rubrica, string> = {
  MATERIAIS: "Materiais",
  SERVICOS_TERCEIROS: "Serviços Terceiros",
  OUTROS_SERVICOS: "Outros Serviços",
  DESLOCACAO_ESTADIAS: "Deslocação e Estadias",
  OUTROS_CUSTOS: "Outros Custos",
  CUSTOS_ESTRUTURA: "Custos de Estrutura",
};

// Cores para as rubricas
const RUBRICA_COLORS: Record<Rubrica, {bg: string, text: string, border: string}> = {
  MATERIAIS: {bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200"},
  SERVICOS_TERCEIROS: {bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200"},
  OUTROS_SERVICOS: {bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200"},
  DESLOCACAO_ESTADIAS: {bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200"},
  OUTROS_CUSTOS: {bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200"},
  CUSTOS_ESTRUTURA: {bg: "bg-red-50", text: "text-red-700", border: "border-red-200"},
};

// Formatar valor monetário
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export default function ProjetoMateriais({ projetoId }: ProjetoMateriaisProps) {
  // Estados
  const [searchTerm, setSearchTerm] = useState("");
  const [rubricaFilter, setRubricaFilter] = useState<string>("todas");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [anoFilter, setAnoFilter] = useState<string>("todos");
  
  // Obter mutations do hook
  const { material: materialMutations } = useMutations(projetoId);
  
  // Query principal para buscar o projeto
  const { data: projeto, isLoading, error } = api.projeto.findById.useQuery(projetoId, {
    enabled: !!projetoId,
  });
  
  // Função para alternar o estado de um material
  const toggleEstadoMaterial = (materialId: number, estadoAtual: boolean) => {
    // Obter o workpackageId do material correspondente
    const material = materiaisFiltrados.find(m => m.id === materialId);
    if (!material) {
      toast.error("Material não encontrado");
      return;
    }
    materialMutations.handleToggleEstado(materialId, !estadoAtual, material.workpackageId, materialMutations);
  };
  
  // Dados processados
  const materiaisFiltrados = useMemo(() => {
    if (!projeto?.workpackages) return [];
    
    // Coletar todos os materiais de todos os workpackages
    let materiais = projeto.workpackages.flatMap(wp => {
      return wp.materiais.map(material => ({
        ...material,
        workpackageName: wp.nome,
        workpackageId: wp.id
      }));
    });
    
    // Aplicar filtros
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      materiais = materiais.filter(material => 
        material.nome.toLowerCase().includes(searchLower) ||
        material.descricao?.toLowerCase().includes(searchLower) ||
        material.workpackageName.toLowerCase().includes(searchLower)
      );
    }
    
    if (rubricaFilter !== "todas") {
      materiais = materiais.filter(material => material.rubrica === rubricaFilter);
    }
    
    if (estadoFilter !== "todos") {
      const estado = estadoFilter === "concluidos";
      materiais = materiais.filter(material => material.estado === estado);
    }
    
    if (anoFilter !== "todos") {
      const ano = parseInt(anoFilter, 10);
      materiais = materiais.filter(material => material.ano_utilizacao === ano);
    }
    
    return materiais;
  }, [projeto, searchTerm, rubricaFilter, estadoFilter, anoFilter]);
  
  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!projeto?.workpackages) return {
      total: 0,
      concluidos: 0,
      pendentes: 0,
      valorTotal: 0,
      valorConcluido: 0,
      anosDisponiveis: []
    };
    
    const materiais = projeto.workpackages.flatMap(wp => wp.materiais);
    const concluidos = materiais.filter(m => m.estado).length;
    const valorTotal = materiais.reduce((sum, m) => sum + Number(m.preco) * m.quantidade, 0);
    const valorConcluido = materiais
      .filter(m => m.estado)
      .reduce((sum, m) => sum + Number(m.preco) * m.quantidade, 0);
      
    // Anos disponíveis
    const anosSet = new Set<number>();
    materiais.forEach(m => anosSet.add(m.ano_utilizacao));
    const anosDisponiveis = Array.from(anosSet).sort((a, b) => a - b);
    
    return {
      total: materiais.length,
      concluidos,
      pendentes: materiais.length - concluidos,
      valorTotal,
      valorConcluido,
      anosDisponiveis
    };
  }, [projeto]);
  
  // Estados de loading e erro
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (error || !projeto) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center text-red-500">
        Erro ao carregar dados dos materiais: {error?.message || "Projeto não encontrado"}
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-5 bg-white/80 backdrop-blur-sm flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Materiais e Serviços</h1>
            <p className="text-sm text-gray-500">Gestão de materiais, serviços e outros custos do projeto</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-blue-200 bg-blue-50 text-blue-800 shadow-sm">
              {estatisticas.total} {estatisticas.total !== 1 ? 'Itens' : 'Item'}
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm">
              {formatCurrency(estatisticas.valorTotal)}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mb-6">
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Itens</p>
                <div className="mt-1 text-2xl font-semibold text-slate-700">{estatisticas.total}</div>
              </div>
              <div className="rounded-full p-3 bg-blue-50 flex-shrink-0 shadow-sm border border-blue-100">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Concluídos</p>
                <div className="mt-1 text-2xl font-semibold text-emerald-600">{estatisticas.concluidos}</div>
                <p className="text-xs text-gray-500">{Math.round((estatisticas.concluidos / estatisticas.total) * 100) || 0}% do total</p>
              </div>
              <div className="rounded-full p-3 bg-emerald-50 flex-shrink-0 shadow-sm border border-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <div className="mt-1 text-2xl font-semibold text-amber-600">{estatisticas.pendentes}</div>
                <p className="text-xs text-gray-500">{Math.round((estatisticas.pendentes / estatisticas.total) * 100) || 0}% do total</p>
              </div>
              <div className="rounded-full p-3 bg-amber-50 flex-shrink-0 shadow-sm border border-amber-100">
                <X className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor Total</p>
                <div className="mt-1 text-2xl font-semibold text-purple-600">{formatCurrency(estatisticas.valorTotal)}</div>
                <p className="text-xs text-gray-500">{formatCurrency(estatisticas.valorConcluido)} concluído</p>
              </div>
              <div className="rounded-full p-3 bg-purple-50 flex-shrink-0 shadow-sm border border-purple-100">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros e Pesquisa */}
      <div className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl overflow-hidden mb-6">
        <div className="border-b border-slate-100/50 px-6 py-3 flex flex-wrap items-center gap-4 bg-white/80 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar materiais..."
              className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200 bg-white/90 shadow-sm focus:ring-2 focus:ring-emerald-200 text-gray-700 hover:shadow-md transition-all duration-300 ease-in-out"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Select value={rubricaFilter} onValueChange={setRubricaFilter}>
              <SelectTrigger className="w-[180px] rounded-full bg-white/90 hover:bg-gray-50/80 text-xs text-gray-600 hover:text-emerald-500 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out">
                <Filter className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Filtrar por rubrica" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 backdrop-blur-sm shadow-lg">
                <SelectItem value="todas">Todas as Rubricas</SelectItem>
                {Object.entries(RUBRICA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-[180px] rounded-full bg-white/90 hover:bg-gray-50/80 text-xs text-gray-600 hover:text-emerald-500 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 backdrop-blur-sm shadow-lg">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="concluidos">Concluídos</SelectItem>
              </SelectContent>
            </Select>
            
            {estatisticas.anosDisponiveis.length > 0 && (
              <Select value={anoFilter} onValueChange={setAnoFilter}>
                <SelectTrigger className="w-[180px] rounded-full bg-white/90 hover:bg-gray-50/80 text-xs text-gray-600 hover:text-emerald-500 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out">
                  <SelectValue placeholder="Filtrar por ano" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 backdrop-blur-sm shadow-lg">
                  <SelectItem value="todos">Todos os Anos</SelectItem>
                  {estatisticas.anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Exibe badges para filtros ativos */}
          {(rubricaFilter !== "todas" || estadoFilter !== "todos" || anoFilter !== "todos") && (
            <div className="flex flex-wrap gap-2 w-full mt-2 animate-in fade-in slide-in-from-top-4 duration-300 ease-in-out">
              {rubricaFilter !== "todas" && (
                <Badge 
                  className="h-9 px-3 rounded-full flex items-center gap-2 transition-all duration-300 ease-in-out bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                >
                  <span>Rubrica: {RUBRICA_LABELS[rubricaFilter as Rubrica]}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setRubricaFilter("todas")}
                    className="h-5 w-5 ml-1 p-0 rounded-full hover:bg-blue-100/70 hover:text-blue-700 transition-colors duration-200 ease-in-out"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {estadoFilter !== "todos" && (
                <Badge 
                  className={`h-9 px-3 rounded-full flex items-center gap-2 transition-all duration-300 ease-in-out ${
                    estadoFilter === "concluidos" 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300" 
                      : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                  }`}
                >
                  <span>Estado: {estadoFilter === "concluidos" ? "Concluídos" : "Pendentes"}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setEstadoFilter("todos")}
                    className={`h-5 w-5 ml-1 p-0 rounded-full transition-colors duration-200 ease-in-out ${
                      estadoFilter === "concluidos" 
                        ? "hover:bg-emerald-100/70 hover:text-emerald-700"
                        : "hover:bg-amber-100/70 hover:text-amber-700"
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {anoFilter !== "todos" && (
                <Badge 
                  className="h-9 px-3 rounded-full flex items-center gap-2 transition-all duration-300 ease-in-out bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                >
                  <span>Ano: {anoFilter}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setAnoFilter("todos")}
                    className="h-5 w-5 ml-1 p-0 rounded-full hover:bg-purple-100/70 hover:text-purple-700 transition-colors duration-200 ease-in-out"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {(rubricaFilter !== "todas" || estadoFilter !== "todos" || anoFilter !== "todos") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setRubricaFilter("todas");
                    setEstadoFilter("todos");
                    setAnoFilter("todos");
                  }}
                  className="text-xs text-slate-500 hover:text-emerald-500 h-9 px-3 rounded-full hover:bg-slate-50 transition-all duration-300 ease-in-out"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar todos
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Tabela de Materiais */}
      <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl">
        <CardHeader className="bg-gray-50/80 backdrop-blur-sm p-4 border-b border-slate-100/50">
          <CardTitle className="text-lg font-medium text-slate-700">Lista de Materiais e Serviços</CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-white/80 backdrop-blur-sm">
          {materiaisFiltrados.length > 0 ? (
            <div className="overflow-x-auto px-6">
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-slate-100/50 hover:bg-transparent">
                    <TableHead className="w-[40px] text-sm font-medium text-slate-700 py-3">Estado</TableHead>
                    <TableHead className="text-sm font-medium text-slate-700 py-3">Nome</TableHead>
                    <TableHead className="text-sm font-medium text-slate-700 py-3">Descrição</TableHead>
                    <TableHead className="text-sm font-medium text-slate-700 py-3">Workpackage</TableHead>
                    <TableHead className="w-[150px] text-sm font-medium text-slate-700 py-3">Rubrica</TableHead>
                    <TableHead className="text-right text-sm font-medium text-slate-700 py-3">Preço</TableHead>
                    <TableHead className="text-right text-sm font-medium text-slate-700 py-3">Qtd.</TableHead>
                    <TableHead className="text-right text-sm font-medium text-slate-700 py-3">Total</TableHead>
                    <TableHead className="text-center text-sm font-medium text-slate-700 py-3">Ano</TableHead>
                    <TableHead className="w-[50px] text-sm font-medium text-slate-700 py-3">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiaisFiltrados.map((material) => {
                    const total = Number(material.preco) * material.quantidade;
                    const { bg, text, border } = RUBRICA_COLORS[material.rubrica];
                    
                    return (
                      <TableRow 
                        key={material.id} 
                        className={`group relative border-b border-slate-100/50 hover:bg-emerald-50/30 transition-colors duration-300 ease-in-out ${material.estado ? "bg-gray-50/30" : ""}`}
                      >
                        <TableCell className="py-3 px-2">
                          <Button
                            variant={material.estado ? "default" : "outline"}
                            size="icon"
                            className={`h-7 w-7 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out ${
                              material.estado ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-500" : "hover:border-emerald-500 hover:text-emerald-500"
                            }`}
                            onClick={() => toggleEstadoMaterial(material.id, material.estado)}
                            disabled={materialMutations.update.isPending}
                          >
                            <Check className={`h-4 w-4 ${material.estado ? "text-white" : "text-gray-400 group-hover:text-emerald-500"}`} />
                          </Button>
                        </TableCell>
                        <TableCell className="py-3 px-2 text-slate-700 text-sm group-hover:text-emerald-600 transition-colors duration-300 font-medium">{material.nome}</TableCell>
                        <TableCell className="py-3 px-2 text-slate-500 text-sm group-hover:text-emerald-600 transition-colors duration-300 max-w-[250px] truncate">
                          {material.descricao || "-"}
                        </TableCell>
                        <TableCell className="py-3 px-2 text-slate-700 text-sm group-hover:text-emerald-600 transition-colors duration-300">{material.workpackageName}</TableCell>
                        <TableCell className="py-3 px-2 text-sm">
                          <Badge variant="outline" className={`${bg} ${text} ${border} shadow-sm`}>
                            {RUBRICA_LABELS[material.rubrica]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-2 text-slate-700 text-sm group-hover:text-emerald-600 transition-colors duration-300 text-right">{formatCurrency(Number(material.preco))}</TableCell>
                        <TableCell className="py-3 px-2 text-slate-700 text-sm group-hover:text-emerald-600 transition-colors duration-300 text-right">{material.quantidade}</TableCell>
                        <TableCell className="py-3 px-2 text-slate-700 text-sm group-hover:text-emerald-600 transition-colors duration-300 text-right font-medium">{formatCurrency(total)}</TableCell>
                        <TableCell className="py-3 px-2 text-slate-700 text-sm group-hover:text-emerald-600 transition-colors duration-300 text-center">{material.ano_utilizacao}</TableCell>
                        <TableCell className="py-3 px-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full hover:bg-white/50 hover:text-emerald-500 transition-all duration-300 ease-in-out"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border border-slate-100/80 bg-white/95 backdrop-blur-sm shadow-lg">
                              <DropdownMenuItem 
                                onClick={() => toggleEstadoMaterial(material.id, material.estado)}
                                className="text-sm hover:text-emerald-500 transition-colors duration-200"
                              >
                                {material.estado ? "Marcar como pendente" : "Marcar como concluído"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-slate-50/80 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/50">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-700">Nenhum material encontrado</p>
                  <p className="text-sm text-slate-500">
                    {searchTerm || rubricaFilter !== "todas" || estadoFilter !== "todos" || anoFilter !== "todos"
                      ? "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa."
                      : "Ainda não existem materiais ou serviços registados neste projeto."}
                  </p>
                </div>
                {(searchTerm || rubricaFilter !== "todas" || estadoFilter !== "todos" || anoFilter !== "todos") && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-full border-slate-200 bg-white/90 text-slate-700 hover:text-emerald-500 hover:bg-white/50 hover:border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out"
                    onClick={() => {
                      setSearchTerm("");
                      setRubricaFilter("todas");
                      setEstadoFilter("todos");
                      setAnoFilter("todos");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 