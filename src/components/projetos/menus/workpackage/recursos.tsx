import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Users } from "lucide-react";
import type { WorkpackageCompleto } from "@/components/projetos/types";
import { Form as RecursoForm } from "@/components/projetos/criar/novo/recursos/form";
import { api } from "@/trpc/react";
import { Item } from "@/components/projetos/criar/novo/recursos/item";
import { Decimal } from "decimal.js";

interface WorkpackageRecursosProps {
  workpackage: WorkpackageCompleto;
  _workpackageId: string;
  projetoId: string;
  canEdit?: boolean;
}

export function WorkpackageRecursos({
  workpackage,
  _workpackageId,
  projetoId,
  canEdit = true,
}: WorkpackageRecursosProps) {
  // Estado para controlar adição de recurso
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [expandedUsuarioId, setExpandedUsuarioId] = useState<string | null>(null);

  const utils = api.useUtils();

  // Query para obter todos os utilizadores usando TanStack
  const { data: utilizadores = { items: [] } } = api.utilizador.core.findAll.useQuery({ limit: 100 });

  const addAlocacaoMutation = api.utilizador.alocacoes.create.useMutation({
    onSuccess: () => {
      utils.projeto.core.findById.invalidate(projetoId);
    },
  });

  const removeAlocacaoMutation = api.utilizador.alocacoes.delete.useMutation({
    onSuccess: () => {
      utils.projeto.core.findById.invalidate(projetoId);
    },
  });

  // Mapear utilizadores para o formato esperado pelo componente
  const utilizadoresList = (utilizadores?.items || []).map((user) => ({
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    regime: user.regime,
  }));

  // Criar mapeamento de userIds para objetos de utilizador
  const usersMappedById = utilizadoresList.reduce(
    (acc, user) => {
      acc[user.id] = user;
      return acc;
    },
    {} as Record<string, (typeof utilizadoresList)[0]>
  );

  // Obter lista de IDs de utilizadores já alocados ao workpackage
  const utilizadoresAlocados = new Set(
    workpackage.recursos?.map((recurso) => recurso.userId) || []
  );

  // Filtrar apenas utilizadores não alocados
  const utilizadoresDisponiveis = utilizadoresList
    .filter((user) => !utilizadoresAlocados.has(user.id));

  // Handler para adicionar recursos
  const handleAddRecurso = (
    _workpackageIdParam: string,
    alocacoes: Array<{
      userId: string;
      mes: number;
      ano: number;
      ocupacao: Decimal;
      user?: any;
    }>
  ) => {
    // Para cada alocação no array, criar uma alocação individual
    alocacoes.forEach((alocacao) => {
      addAlocacaoMutation.mutate({
        workpackageId: _workpackageId,
        userId: alocacao.userId,
        mes: alocacao.mes,
        ano: alocacao.ano,
        ocupacao: Number(alocacao.ocupacao),
      });
    });

    setAddingRecurso(false);
  };

  // Handler para atualizar alocações de um recurso
  const handleUpdateAlocacao = (userId: string, alocacoes: Array<any>) => {
    // Para cada alocação no array, usar a mutação updateAlocacao (ou addAlocacao com upsert)
    alocacoes.forEach((alocacao) => {
      addAlocacaoMutation.mutate({
        workpackageId: _workpackageId,
        userId: userId,
        mes: alocacao.mes,
        ano: alocacao.ano,
        ocupacao: Number(alocacao.ocupacao),
      });
    });
  };

  // Handler para remover recurso
  const handleRemoveRecurso = (userId: string) => {
    if (confirm("Tem a certeza que deseja remover este recurso e todas as suas alocações?")) {
      // Encontrar todas as alocações deste utilizador neste workpackage
      const alocacoesUsuario = workpackage.recursos?.filter(
        (r) => r.userId === userId && r.workpackageId === _workpackageId
      ) || [];

      // Remover cada alocação individualmente
      alocacoesUsuario.forEach((alocacao) => {
        removeAlocacaoMutation.mutate({
          workpackageId: _workpackageId,
          userId: alocacao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
        });
      });
    }
  };

  // Agrupar recursos por utilizador
  const agruparRecursosPorUtilizador = () => {
    if (!workpackage.recursos || workpackage.recursos.length === 0) return [];

    // Filter recursos to only include those from the current workpackage
    const recursosDoWorkpackage = workpackage.recursos.filter(
      (recurso) => recurso.workpackageId === _workpackageId
    );
    
    if (recursosDoWorkpackage.length === 0) return [];

    const usuariosMap = new Map<
      string,
      {
        userId: string;
        user?: any;
        alocacoes: Array<{
          mes: number;
          ano: number;
          ocupacao: Decimal;
        }>;
        total: number;
      }
    >();

    recursosDoWorkpackage.forEach((recurso) => {
      const userId = recurso.userId;

      if (!usuariosMap.has(userId)) {
        const userInfo = utilizadoresList.find((u) => u.id === userId);
        usuariosMap.set(userId, {
          userId,
          user: userInfo,
          alocacoes: [],
          total: 0,
        });
      }

      const usuario = usuariosMap.get(userId)!;
      usuario.alocacoes.push({
        mes: recurso.mes,
        ano: recurso.ano,
        ocupacao: new Decimal(recurso.ocupacao),
      });

      usuario.total += Number(recurso.ocupacao);
    });

    return Array.from(usuariosMap.values());
  };

  const recursosPorUtilizador = agruparRecursosPorUtilizador();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recursos</h2>
          <p className="text-sm text-gray-500">Gerir recursos alocados</p>
        </div>

        {!addingRecurso && canEdit && (
          <Button
            onClick={() => setAddingRecurso(true)}
            className="h-10 bg-azul text-white hover:bg-azul/90"
            disabled={utilizadoresDisponiveis.length === 0}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Novo Recurso
          </Button>
        )}
      </div>

      {/* Formulário para adicionar novo recurso */}
      {addingRecurso && canEdit && (
        <div className="w-full h-full animate-in fade-in-50 slide-in-from-top-5">
          <RecursoForm
            workpackageId={workpackage.id}
            inicio={workpackage.inicio || new Date()}
            fim={workpackage.fim || new Date()}
            utilizadores={utilizadoresDisponiveis}
            onAddAlocacao={handleAddRecurso}
            onCancel={() => setAddingRecurso(false)}
            projetoEstado={workpackage.projeto?.estado || "RASCUNHO"}
            _projeto={workpackage.projeto || {}}
            _alocacoesExistentes={workpackage.recursos || []}
            _onAlocacoes={(alocacoes) => {
              // Map the alocacoes to the format expected by handleAddRecurso
              const formattedAlocacoes = alocacoes.map((alocacao) => ({
                userId: alocacao.userId,
                mes: alocacao.mes,
                ano: alocacao.ano,
                ocupacao: new Decimal(alocacao.ocupacao),
                user: usersMappedById[alocacao.userId],
              }));
              handleAddRecurso(workpackage.id, formattedAlocacoes);
            }}
            _usersMappedById={usersMappedById}
            _isClienteAtivo={true}
          />
        </div>
      )}

      {/* Lista de recursos agrupados por utilizador */}
      {recursosPorUtilizador.length > 0 ? (
        <div className="space-y-2">
          {recursosPorUtilizador.map((recursoInfo) => {
            // Encontrar o utilizador a partir do userId
            const membroEquipa = utilizadoresList.find((u) => u.id === recursoInfo.userId);

            if (!membroEquipa) return null;

            // Add userId directly from recursoInfo.userId to each alocacao
            const alocacoesWithUserId = recursoInfo.alocacoes.map(alocacao => ({
              ...alocacao,
              userId: recursoInfo.userId
            }));

            return (
              <Item
                key={recursoInfo.userId}
                user={membroEquipa}
                alocacoes={alocacoesWithUserId}
                isExpanded={expandedUsuarioId === recursoInfo.userId}
                onToggleExpand={() => {
                  if (expandedUsuarioId === recursoInfo.userId) {
                    setExpandedUsuarioId(null);
                  } else {
                    setExpandedUsuarioId(recursoInfo.userId);
                  }
                }}
                onRemove={() => handleRemoveRecurso(recursoInfo.userId)}
                onUpdateAlocacao={handleUpdateAlocacao}
                inicio={workpackage.inicio || new Date()}
                fim={workpackage.fim || new Date()}
                projetoEstado={workpackage.projeto?.estado || "RASCUNHO"}
                workpackageId={workpackage.id}
                utilizadores={utilizadoresList}
                readOnly={!canEdit}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h3 className="mb-1 text-lg font-medium text-gray-700">Nenhum recurso alocado</h3>
          <p className="mb-4 text-sm text-gray-500">
            Aloque recursos humanos a este workpackage
          </p>
          {canEdit && utilizadoresDisponiveis.length > 0 && (
            <Button
              className="bg-azul text-white hover:bg-azul/90"
              onClick={() => setAddingRecurso(true)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Alocar Recurso
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
