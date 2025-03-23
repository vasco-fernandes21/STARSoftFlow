import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Form as RecursoForm } from "@/components/projetos/criar/novo/recursos/form";
import { Details as RecursoDetails } from "@/components/projetos/criar/novo/recursos/details";
import { type Prisma } from "@prisma/client";
import { formatarDataSegura } from "@/lib/utils";
import { useState } from "react";
import { agruparAlocacoesPorAnoMes } from "@/lib/utils";
import { api } from "@/trpc/react";
import { WorkpackageCompleto, AlocacaoRecursoWithRelations } from "@/components/projetos/types";

type WorkpackageRecursosProps = {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  addingRecurso: boolean;
  setAddingRecurso: (value: boolean) => void;
  onAddAlocacao: () => Promise<void>;
  onRemoveRecurso: (userId: string) => Promise<void>;
};

export function WorkpackageRecursos({
  workpackage,
  workpackageId,
  addingRecurso,
  setAddingRecurso,
  onAddAlocacao,
  onRemoveRecurso
}: WorkpackageRecursosProps) {
  // estados locais
  const [expandedRecursos, setExpandedRecursos] = useState<Record<string, boolean>>({});
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  // obter dados de utilizadores
  const { data: utilizadores } = api.utilizador.getAll.useQuery(
    { limit: 100 },
    { staleTime: 5 * 60 * 1000 }
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Recursos</span>
        {!addingRecurso && (
          <Button
            variant="ghost"
            onClick={() => setAddingRecurso(true)}
            className="h-7 w-7 rounded-md bg-gray-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
                    
      <div className="space-y-2">
        {addingRecurso && (
          <div className="bg-gray-50/50 rounded-md p-3">
            <RecursoForm
              workpackageId={workpackageId}
              inicio={workpackage.inicio || new Date()}
              fim={workpackage.fim || new Date()}
              onCancel={() => setAddingRecurso(false)}
              onAddAlocacao={onAddAlocacao}
              utilizadores={(utilizadores?.items || []).map(user => ({
                id: user.id,
                name: user.name || '',
                email: user.email || '',
                regime: user.regime
              }))}
            />  
          </div>
        )}

        {/* Processa e agrupa os recursos por utilizador */}
        {(() => {
          // Agrupa as alocações por userId
          const recursosPorUser: Record<string, any> = {};
          
          // Para cada recurso no array de recursos
          workpackage.recursos.forEach(recurso => {
            const userId = recurso.userId;
            
            // Se esse userId ainda não existe no objeto, criamos
            if (!recursosPorUser[userId]) {
              recursosPorUser[userId] = {
                userId: userId,
                alocacoes: [],
                expandido: expandedRecursos[userId] || false,
                user: recurso.user
              };
            }
            
            // Adicionamos a alocação atual ao array de alocações deste utilizador
            recursosPorUser[userId].alocacoes.push({
              mes: recurso.mes,
              ano: recurso.ano,
              ocupacao: recurso.ocupacao
            });
          });
          
          // Renderiza um Details para cada utilizador único
          return Object.values(recursosPorUser).map((recurso: any) => {
            // Agrupa as alocações por ano e mês
            const alocacoesPorAnoMes = agruparAlocacoesPorAnoMes(recurso.alocacoes);
            
            return (
              <RecursoDetails
                key={recurso.userId}
                userId={recurso.userId}
                recurso={recurso}
                membroEquipa={recurso.user}
                isExpanded={recurso.expandido}
                workpackageId={workpackageId}
                onToggleExpand={() => {
                  setExpandedRecursos(prev => ({
                    ...prev,
                    [recurso.userId]: !prev[recurso.userId]
                  }));
                }}
                onEdit={() => {
                  // Definir qual recurso está sendo editado
                  setEditingResourceId(recurso.userId);
                }}
                onRemove={() => onRemoveRecurso(recurso.userId)}
                formatarDataSegura={formatarDataSegura}
                alocacoesPorAnoMes={alocacoesPorAnoMes}
                isEditing={editingResourceId === recurso.userId}
                onCancelEdit={() => {
                  setEditingResourceId(null);
                }}
                onSaveEdit={(workpackageId, alocacoes) => {
                  // lógica de salvar edição
                }}
                utilizadores={(utilizadores?.items || []).map(user => ({
                  id: user.id,
                  name: user.name || '',
                  email: user.email || '',
                  regime: user.regime
                }))}
                inicio={workpackage.inicio || new Date()}
                fim={workpackage.fim || new Date()}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}
