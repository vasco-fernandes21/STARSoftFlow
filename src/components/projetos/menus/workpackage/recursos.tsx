import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Users } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { useWorkpackageMutations } from "@/hooks/useWorkpackageMutations";
import { Form as RecursoForm } from "@/components/projetos/criar/novo/recursos/form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { Details } from "@/components/projetos/criar/novo/recursos/details";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";

interface WorkpackageRecursosProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
}

export function WorkpackageRecursos({ 
  workpackage,
  workpackageId
}: WorkpackageRecursosProps) {
  // Estado para controlar adição de recurso
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [editingUsuarioId, setEditingUsuarioId] = useState<string | null>(null);
  const [expandedUsuarioId, setExpandedUsuarioId] = useState<string | null>(null);
  
  // Obter as mutações através do hook global
  const { 
    invalidateQueries
  } = useWorkpackageMutations(() => Promise.resolve());
  
  // Definir mutações específicas para recursos
  const createAlocacaoMutation = api.workpackage.addAlocacao.useMutation({
    onSuccess: async () => {
      await invalidateQueries(workpackageId);
    }
  });
  
  const removeAlocacaoMutation = api.workpackage.removeAlocacao.useMutation({
    onSuccess: async () => {
      await invalidateQueries(workpackageId);
    }
  });
  
  // Query para obter todos os utilizadores
  const { data: utilizadores = { items: [] } } = api.utilizador.getAll.useQuery({ limit: 100 });
  
  // Mapear utilizadores para o formato esperado pelo componente
  const utilizadoresList = (utilizadores?.items || []).map(user => ({
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    regime: user.regime
  }));
  
  // Handler para adicionar recursos
  const handleAddRecurso = (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
    user?: any;
  }>) => {
    // Para cada alocação no array, criar uma alocação individual
    alocacoes.forEach(alocacao => {
      createAlocacaoMutation.mutate({
        workpackageId: workpackageId,
        userId: alocacao.userId,
        mes: alocacao.mes,
        ano: alocacao.ano,
        ocupacao: Number(alocacao.ocupacao)
      });
    });
    
    setAddingRecurso(false);
    setEditingUsuarioId(null);
  };
  
  // Handler para remover recurso
  const handleRemoveRecurso = (userId: string) => {
    if (confirm("Tem certeza que deseja remover este recurso e todas as suas alocações?")) {
      // Encontrar todas as alocações deste utilizador
      const alocacoesUsuario = workpackage.recursos?.filter(r => r.userId === userId) || [];
      
      // Remover cada alocação individualmente
      alocacoesUsuario.forEach(alocacao => {
        removeAlocacaoMutation.mutate({
          workpackageId,
          userId: alocacao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano
        });
      });
    }
  };
  
  // Função para formatar data de forma segura
  const formatarDataSegura = (ano: string | number, mes: string | number, formatString: string): string => {
    try {
      return format(new Date(Number(ano), Number(mes) - 1), formatString, { locale: pt });
    } catch (error) {
      return `${mes}/${ano}`;
    }
  };
  
  // Agrupar recursos por utilizador
  const agruparRecursosPorUtilizador = () => {
    if (!workpackage.recursos || workpackage.recursos.length === 0) return [];
    
    const usuariosMap = new Map<string, {
      userId: string;
      alocacoes: Array<{
        mes: number;
        ano: number;
        ocupacao: number;
      }>;
      total: number;
    }>();
    
    workpackage.recursos.forEach(recurso => {
      const userId = recurso.userId;
      
      if (!usuariosMap.has(userId)) {
        usuariosMap.set(userId, {
          userId,
          alocacoes: [],
          total: 0
        });
      }
      
      const usuario = usuariosMap.get(userId)!;
      usuario.alocacoes.push({
        mes: recurso.mes,
        ano: recurso.ano,
        ocupacao: Number(recurso.ocupacao)
      });
      
      usuario.total += Number(recurso.ocupacao);
    });
    
    return Array.from(usuariosMap.values());
  };
  
  // Processar alocações por utilizador para formato esperado pelo componente Details
  const processarAlocacoesPorUsuario = (userId: string) => {
    if (!workpackage.recursos) return {};
    
    const alocacoesUsuario = workpackage.recursos.filter(r => r.userId === userId);
    const alocacoesPorAnoMes: Record<string, Record<number, number>> = {};
    
    alocacoesUsuario.forEach(alocacao => {
      const ano = alocacao.ano.toString();
      if (!alocacoesPorAnoMes[ano]) {
        alocacoesPorAnoMes[ano] = {};
      }
      
      // Armazenar o valor em percentagem (0-100)
      alocacoesPorAnoMes[ano][alocacao.mes] = Number(alocacao.ocupacao) * 100;
    });
    
    return alocacoesPorAnoMes;
  };
  
  const recursosPorUtilizador = agruparRecursosPorUtilizador();
  const totalRecursos = workpackage.recursos?.length || 0;
  const pessoasAlocadas = recursosPorUtilizador.length;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recursos</h2>
          <p className="text-sm text-gray-500">Gerir recursos alocados</p>
        </div>
        
        {!addingRecurso && (
          <Button
            onClick={() => setAddingRecurso(true)}
            className="h-10 bg-azul hover:bg-azul/90 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Recurso
          </Button>
        )}
      </div>
      
      {/* Formulário para adicionar novo recurso */}
      {addingRecurso && (
        <Card className="p-6 border border-azul/10 bg-white shadow-sm rounded-xl animate-in fade-in-50 slide-in-from-top-5 duration-200">
          <h3 className="text-lg font-medium text-azul mb-5">Novo Recurso</h3>
          <RecursoForm
            workpackageId={workpackage.id}
            inicio={workpackage.inicio || new Date()}
            fim={workpackage.fim || new Date()}
            utilizadores={utilizadoresList} 
            onAddAlocacao={handleAddRecurso}
            onCancel={() => setAddingRecurso(false)}
          />
        </Card>
      )}
      
      {/* Lista de recursos agrupados por utilizador */}
      {recursosPorUtilizador.length > 0 ? (
        <div className="space-y-2">
          {recursosPorUtilizador.map((usuario) => {
            // Encontrar o utilizador a partir do userId
            const membroEquipa = utilizadoresList.find(u => u.id === usuario.userId);
            
            return (
              <Details
                key={usuario.userId}
                userId={usuario.userId}
                recurso={usuario}
                membroEquipa={membroEquipa}
                isExpanded={expandedUsuarioId === usuario.userId}
                workpackageId={workpackageId}
                onToggleExpand={() => {
                  if (expandedUsuarioId === usuario.userId) {
                    setExpandedUsuarioId(null);
                  } else {
                    setExpandedUsuarioId(usuario.userId);
                  }
                }}
                onEdit={() => setEditingUsuarioId(usuario.userId)}
                onRemove={() => handleRemoveRecurso(usuario.userId)}
                formatarDataSegura={formatarDataSegura}
                alocacoesPorAnoMes={processarAlocacoesPorUsuario(usuario.userId)}
                isEditing={editingUsuarioId === usuario.userId}
                onCancelEdit={() => setEditingUsuarioId(null)}
                onSaveEdit={handleAddRecurso}
                utilizadores={utilizadoresList}
                inicio={workpackage.inicio || new Date()}
                fim={workpackage.fim || new Date()}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-azul/10 shadow-sm">
          <Users className="h-12 w-12 text-azul/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-azul mb-2">Nenhum recurso alocado</h3>
          <p className="text-sm text-azul/60 max-w-md mx-auto">Clique em "Novo Recurso" para alocar recursos humanos a este workpackage</p>
        </div>
      )}
    </div>
  );
}
