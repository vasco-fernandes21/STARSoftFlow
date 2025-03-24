"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WorkpackageContextType {
  updateTarefaEstado: (workpackageId: string, tarefaId: string, novoEstado: boolean) => void;
  subscribeToWorkpackageUpdates: (workpackageId: string, callback: (estado: boolean) => void) => () => void;
}

const WorkpackageContext = createContext<WorkpackageContextType | null>(null);

export function WorkpackageProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  // Referência para os callbacks de atualização por workpackage
  const workpackageSubscriptions = useRef<Record<string, Set<(estado: boolean) => void>>>({});

  // Registrar um callback para atualizações de estado
  const subscribeToWorkpackageUpdates = useCallback((workpackageId: string, callback: (estado: boolean) => void) => {
    // Criar o conjunto se não existir
    if (!workpackageSubscriptions.current[workpackageId]) {
      workpackageSubscriptions.current[workpackageId] = new Set();
    }
    
    // Adicionar o callback
    workpackageSubscriptions.current[workpackageId].add(callback);
    
    // Retornar a função para cancelar a inscrição
    return () => {
      if (workpackageSubscriptions.current[workpackageId]) {
        workpackageSubscriptions.current[workpackageId].delete(callback);
      }
    };
  }, []);

  // Função para atualizar o estado da tarefa e do workpackage otimisticamente
  const updateTarefaEstado = useCallback((workpackageId: string, tarefaId: string, novoEstado: boolean) => {
    // 1. Atualizar cache da tarefa
    queryClient.setQueryData(
      ['tarefa.findById', tarefaId],
      (oldData: any) => oldData ? { ...oldData, estado: novoEstado } : oldData
    );

    // 2. Atualizar cache do workpackage
    queryClient.setQueryData(
      ['workpackage.findById', { id: workpackageId }],
      (oldData: any) => {
        if (!oldData) return oldData;
        
        // Atualizar a tarefa específica
        const tarefasAtualizadas = oldData.tarefas.map((t: any) => 
          t.id === tarefaId ? { ...t, estado: novoEstado } : t
        );
        
        // Recalcular estado do workpackage imediatamente
        const todasConcluidas = tarefasAtualizadas.length > 0 && 
                               tarefasAtualizadas.every((t: any) => t.estado);
        
        console.log(`Workpackage ${workpackageId} estado atualizado para: ${todasConcluidas}`);
        
        // Notificar todos os inscritos sobre a mudança de estado
        if (workpackageSubscriptions.current[workpackageId]) {
          workpackageSubscriptions.current[workpackageId].forEach(callback => {
            callback(todasConcluidas);
          });
        }
        
        return {
          ...oldData,
          tarefas: tarefasAtualizadas,
          estado: todasConcluidas
        };
      }
    );

    // 3. Atualizar também a query do projeto para refletir mudanças imediatamente
    // nos componentes que dependem dela (como o Cronograma)
    queryClient.setQueriesData(
      { queryKey: ['projeto.findById'] },
      (oldData: any) => {
        if (!oldData) return oldData;
        
        // Verificar se o projeto contém o workpackage que precisamos atualizar
        const hasWorkpackage = oldData.workpackages?.some((wp: any) => wp.id === workpackageId);
        if (!hasWorkpackage) return oldData;
        
        // Atualizar os workpackages do projeto
        const workpackagesAtualizados = oldData.workpackages.map((wp: any) => {
          if (wp.id !== workpackageId) return wp;
          
          // Atualizar a tarefa específica
          const tarefasAtualizadas = wp.tarefas.map((t: any) => 
            t.id === tarefaId ? { ...t, estado: novoEstado } : t
          );
          
          // Recalcular estado do workpackage
          const todasConcluidas = tarefasAtualizadas.length > 0 && 
                                  tarefasAtualizadas.every((t: any) => t.estado);
          
          return {
            ...wp,
            tarefas: tarefasAtualizadas,
            estado: todasConcluidas
          };
        });
        
        // Atualizar o progresso do projeto
        const totalTarefas = workpackagesAtualizados.reduce((acc: number, wp: any) => acc + wp.tarefas.length, 0);
        const tarefasConcluidas = workpackagesAtualizados.reduce(
          (acc: number, wp: any) => acc + wp.tarefas.filter((t: any) => t.estado).length, 
          0
        );
        
        const novoProjeto = {
          ...oldData,
          workpackages: workpackagesAtualizados,
          progresso: totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0
        };
        
        return novoProjeto;
      }
    );
  }, [queryClient]);

  // Memoizar o valor do contexto para evitar re-renderizações desnecessárias
  const contextValue = useMemo(() => ({
    updateTarefaEstado,
    subscribeToWorkpackageUpdates
  }), [updateTarefaEstado, subscribeToWorkpackageUpdates]);

  return (
    <WorkpackageContext.Provider value={contextValue}>
      {children}
    </WorkpackageContext.Provider>
  );
}

export const useWorkpackage = () => {
  const context = useContext(WorkpackageContext);
  if (!context) {
    throw new Error('useWorkpackage deve ser usado dentro de um WorkpackageProvider');
  }
  return context;
}; 