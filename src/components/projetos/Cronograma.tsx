import type { Workpackage, Tarefa } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useContext, useMemo } from "react";
import { MenuTarefa } from "@/components/projetos/menus/tarefa";
import { format, getDaysInMonth, differenceInDays, addDays, isSameMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/trpc/react";
import { motion } from "framer-motion";
import { MenuWorkpackage } from "@/components/projetos/menus/workpackage";
import { useQueryClient } from "@tanstack/react-query";
import { useMutations } from "@/hooks/useMutations";
import { ProjetoCacheContext } from '@/app/projetos/[id]/page';

interface CronogramaOptions {
  leftColumnWidth?: number;
  disableInteractions?: boolean;
  hideWorkpackageEdit?: boolean;
  compactMode?: boolean;
}

interface EntregavelType {
  id: string;
  nome: string;
  data: Date | null;
}

interface TarefaWithEntregaveis extends Tarefa {
  entregaveis?: EntregavelType[];
}

interface WorkpackageWithTarefas extends Workpackage {
  tarefas: TarefaWithEntregaveis[];
}

interface CronogramaProps {
  workpackages: WorkpackageWithTarefas[];
  startDate: Date;
  endDate: Date;
  onSelectTarefa?: (tarefaId: string) => void;
  onUpdateWorkPackage?: () => Promise<void>;
  onUpdateTarefa?: () => Promise<void>;
  options?: CronogramaOptions;
  projetoId: string;
}

// Interface para representar cada mês com seus dias
interface MonthInfo {
  label: string;
  date: Date;
  daysInMonth: number;
  width: number; // Largura proporcional do mês
  startOffset: number; // Offset acumulado desde o início
}

export function Cronograma({ 
  workpackages, 
  startDate,
  endDate,
  onSelectTarefa,
  onUpdateWorkPackage,
  onUpdateTarefa,
  options = {},
  projetoId
}: CronogramaProps) {
  const [selectedTarefa, setSelectedTarefa] = useState<string | null>(null);
  const [selectedWorkpackage, setSelectedWorkpackage] = useState<string | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const utils = api.useContext();
  const queryClient = useQueryClient();
  
  // Usar o contexto com a cache centralizada
  const cacheContext = useContext(ProjetoCacheContext);
  const mutations = useMutations(projetoId);
  
  // Estado para mudanças pendentes
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const leftColumn = leftColumnRef.current;
    const timeline = timelineRef.current;
    
    if (!leftColumn || !timeline) return;
    
    const handleTimelineScroll = () => {
      leftColumn.scrollTop = timeline.scrollTop;
    };
    
    const handleLeftColumnScroll = () => {
      timeline.scrollTop = leftColumn.scrollTop;
    };
    
    timeline.addEventListener('scroll', handleTimelineScroll);
    leftColumn.addEventListener('scroll', handleLeftColumnScroll);
    
    return () => {
      timeline.removeEventListener('scroll', handleTimelineScroll);
      leftColumn.removeEventListener('scroll', handleLeftColumnScroll);
    };
  }, []);
  
  // Calcular informações de meses com precisão de dias
  const months = useMemo(() => {
    const result: MonthInfo[] = [];
    const current = new Date(startDate);
    current.setDate(1); // Começar no primeiro dia do mês
    
    // Calcular meses com largura fixa para melhor visualização
    let accumulatedOffset = 0;
    // Largura fixa para cada mês em pixels - valor alto para dar mais espaço
    const fixedMonthWidthPx = 200;
    
    while (current <= endDate) {
      const daysInMonth = getDaysInMonth(current);
      
      // Calcular dias visíveis neste mês (considerando as datas de início e fim)
      let visibleDays = daysInMonth;
      
      // Se for o primeiro mês, ajustar para os dias restantes
      if (isSameMonth(current, startDate)) {
        visibleDays = daysInMonth - (startDate.getDate() - 1);
      }
      
      // Se for o último mês, ajustar para os dias até o fim
      if (isSameMonth(current, endDate)) {
        visibleDays = Math.min(visibleDays, endDate.getDate());
      }
      
      result.push({
        label: format(current, "LLL/yy", { locale: ptBR }).toLowerCase(),
        date: new Date(current),
        daysInMonth: visibleDays,
        width: fixedMonthWidthPx, // Largura fixa em pixels
        startOffset: accumulatedOffset
      });
      
      accumulatedOffset += fixedMonthWidthPx;
      current.setMonth(current.getMonth() + 1);
    }
    
    return result;
  }, [startDate, endDate]);

  // Função para calcular a posição exata baseada em dias
  const getExactPositionByDate = (date: Date) => {
    if (date < startDate || date > endDate) return null;
    
    // Encontrar o mês que contém esta data
    const month = months.find(m => 
      date.getFullYear() === m.date.getFullYear() && 
      date.getMonth() === m.date.getMonth()
    );
    
    if (!month) return null;
    
    // Calcular a posição dentro do mês
    const totalDaysInMonth = month.daysInMonth;
    const dayOfMonth = date.getDate();
    const startDateOfMonth = startDate.getMonth() === date.getMonth() && 
                             startDate.getFullYear() === date.getFullYear() 
                             ? startDate.getDate() 
                             : 1;
    
    // Posição relativa dentro do mês
    const dayPosition = (dayOfMonth - startDateOfMonth) / totalDaysInMonth;
    
    // Posição absoluta baseada no offset do mês e sua largura
    const totalWidth = months.reduce((sum, m) => sum + m.width, 0);
    const monthStartPercent = (month.startOffset / totalWidth) * 100;
    const monthWidthPercent = (month.width / totalWidth) * 100;
    
    return monthStartPercent + (dayPosition * monthWidthPercent);
  };

  const getCurrentDayPosition = () => {
    const today = new Date();
    if (today < startDate || today > endDate) return null;

    return getExactPositionByDate(today);
  };

  const getTarefaPosition = (tarefa: TarefaWithEntregaveis) => {
    const tarefaStart = tarefa.inicio ? new Date(tarefa.inicio) : null;
    const tarefaEnd = tarefa.fim ? new Date(tarefa.fim) : null;
    
    if (!tarefaStart || !tarefaEnd) return null;
    
    // Garantir que as datas estejam dentro do intervalo
    const effectiveStart = tarefaStart < startDate ? startDate : tarefaStart;
    const effectiveEnd = tarefaEnd > endDate ? endDate : tarefaEnd;
    
    // Calcular posições exatas baseadas em dias
    const startPosition = getExactPositionByDate(effectiveStart);
    const endPosition = getExactPositionByDate(effectiveEnd);
    
    if (startPosition === null || endPosition === null) return null;
    
    // Calcular a largura baseada na duração em dias
    const width = endPosition - startPosition + (1 / differenceInDays(endDate, startDate)) * 100;
    
    return {
      left: startPosition,
      width: width > 0 ? width : 0.5, // Garantir largura mínima visível
    };
  };

  const handleTarefaClick = (tarefa: TarefaWithEntregaveis) => {
    if (disableInteractions) return;
    setSelectedTarefa(tarefa.id);
    if (onSelectTarefa) onSelectTarefa(tarefa.id);
  };

  const sortTarefas = (tarefas: TarefaWithEntregaveis[]) => {
    return [...tarefas].sort((a, b) => {
      const dateA = a.inicio ? new Date(a.inicio) : new Date(0);
      const dateB = b.inicio ? new Date(b.inicio) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const sortWorkpackages = (wps: (Workpackage & { tarefas: Tarefa[] })[]) => {
    return [...wps].sort((a, b) => {
      const dateA = a.inicio ? new Date(a.inicio) : new Date(0);
      const dateB = b.inicio ? new Date(b.inicio) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const sortedWorkpackages = sortWorkpackages(workpackages);

  const {
    leftColumnWidth = 300,
    disableInteractions = false,
    hideWorkpackageEdit = false,
    compactMode = false
  } = options;

  const currentDayPosition = getCurrentDayPosition();

  // Função para obter os entregáveis com posições exatas
  const getEntregavelExactPosition = (entregavel: EntregavelType, tarefaInicio: Date, tarefaFim: Date) => {
    if (!entregavel.data) return null;
    
    // Verificar se o entregável está dentro do período da tarefa
    if (!isWithinInterval(entregavel.data, { start: tarefaInicio, end: tarefaFim })) {
      // Posicionar no início ou fim da tarefa se estiver fora do intervalo
      const referenceDate = entregavel.data < tarefaInicio ? tarefaInicio : tarefaFim;
      return getExactPositionByDate(referenceDate);
    }
    
    // Calcular a posição exata baseada em dias dentro da tarefa
    const totalDaysInTarefa = differenceInDays(tarefaFim, tarefaInicio) + 1;
    const daysSinceStart = differenceInDays(entregavel.data, tarefaInicio);
    
    if (totalDaysInTarefa <= 1) return 50; // Centralizar se a tarefa durar apenas um dia
    
    return (daysSinceStart / totalDaysInTarefa) * 100;
  };

  // Função para lidar com atualizações de tarefa
  const handleTarefaUpdate = async (data: any, workpackageId?: string) => {
    if (!selectedTarefa) return;
    
    // Atualizar estado local imediatamente
    setPendingUpdates(prev => ({
      ...prev,
      [selectedTarefa]: {
        ...data,
        workpackageId: workpackageId || ''
      }
    }));
    
    // Atualizar via mutação
    mutations.tarefa.update.mutate(
      {
        id: selectedTarefa,
        data: {
          ...data,
          workpackageId: workpackageId || ''
        }
      },
      {
        onSuccess: () => {
          // Limpar pendingUpdates apenas para esta tarefa específica
          setPendingUpdates(prev => {
            const updated = {...prev};
            delete updated[selectedTarefa];
            return updated;
          });
        }
      }
    );
    
    if (onUpdateTarefa) {
      await onUpdateTarefa();
    }
  };
  
  // Função para lidar com atualizações de workpackage
  const handleWorkpackageUpdate = async () => {
    if (onUpdateWorkPackage) {
      await onUpdateWorkPackage();
    }
  };

  // Função para obter a tarefa com as atualizações pendentes aplicadas
  const getTarefaAtualizada = (tarefa: TarefaWithEntregaveis) => {
    const pendingUpdate = pendingUpdates[tarefa.id];
    if (!pendingUpdate) return tarefa;
    
    return {
      ...tarefa,
      ...pendingUpdate,
      estado: 'estado' in pendingUpdate ? pendingUpdate.estado : tarefa.estado
    };
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex w-full h-full overflow-hidden">
        <div 
          ref={leftColumnRef} 
          className="flex-shrink-0 sticky left-0 bg-white z-20 border-r border-slate-200/50 overflow-y-scroll scrollbar-none"
          style={{ 
            width: `${leftColumnWidth}px`,
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          <div className="sticky top-0 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 z-20">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Workpackage/Tarefa
            </div>
          </div>
          <div className="py-1">
            {sortedWorkpackages.map((wp, index) => (
              <div key={wp.id} className={cn("group/wp", index === 0 && "border-t border-slate-100/50")}>
                <div 
                  className={cn(
                    "flex items-center px-4 cursor-pointer hover:bg-slate-50/80 transition-colors bg-slate-50/30",
                    "h-10"
                  )}
                  onClick={() => {
                    if (!disableInteractions) {
                      setSelectedWorkpackage(wp.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <h3 
                      className="text-sm font-medium text-slate-700 truncate"
                      style={{ maxWidth: `${leftColumnWidth - 80}px` }}
                    >
                      {wp.nome}
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      {wp.tarefas.filter(t => getTarefaAtualizada(t).estado).length}/{wp.tarefas.length}
                    </span>
                  </div>
                </div>
                {sortTarefas(wp.tarefas).map((tarefa) => {
                  const tarefaAtualizada = getTarefaAtualizada(tarefa);
                  const estado = tarefaAtualizada.estado;
                  
                  return (
                    <div 
                      key={tarefa.id} 
                      className={cn(
                        "flex items-center px-4 cursor-pointer hover:bg-slate-50/80 transition-colors border-t border-slate-100/50",
                        "h-10"
                      )}
                      onClick={() => handleTarefaClick(tarefaAtualizada)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div 
                          className={cn(
                            "w-2 h-2 rounded-full border transition-colors flex-shrink-0",
                            estado 
                              ? "bg-emerald-500 border-emerald-500" 
                              : "border-blue-500 group-hover/task:border-blue-600"
                          )}
                        />
                        <span 
                          className="text-sm text-slate-600 truncate group-hover/task:text-slate-900 transition-colors"
                          style={{ maxWidth: `${leftColumnWidth - 48}px` }}
                        >
                          {tarefaAtualizada.nome}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div 
          ref={timelineRef} 
          className="overflow-x-auto flex-1 overflow-y-scroll scrollbar-none bg-slate-50/30"
        >
          <div className="inline-block min-w-max relative" style={{ minWidth: "1600px" }}>
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
              <div className="flex w-full">
                {months.map((month) => (
                  <div 
                    key={month.label}
                    className="relative py-3 px-2 text-center border-r border-slate-200/70"
                    style={{ width: `${month.width}%` }}
                  >
                    <div className="text-xs font-medium text-slate-600">
                      {month.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {currentDayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-500/20 z-10"
                  style={{ left: `${currentDayPosition}%` }}
                >
                  <div className="absolute -top-1 w-1.5 h-1.5 bg-blue-500 rounded-full -translate-x-1/2 shadow-sm" />
                  <div className="absolute -bottom-1 w-1.5 h-1.5 bg-blue-500 rounded-full -translate-x-1/2 shadow-sm" />
                </div>
              )}

              <div className="relative z-0">
                {sortedWorkpackages.map((wp) => (
                  <div key={wp.id} className="relative">
                    <div className="h-10 relative flex items-center border-b border-slate-100 bg-slate-50/50">
                      <div className="absolute inset-0 flex">
                        {months.map((month, index) => (
                          <div 
                            key={index} 
                            className="border-r border-slate-200/50 h-full" 
                            style={{ width: `${month.width}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {sortTarefas(wp.tarefas).map((tarefa) => {
                      const position = getTarefaPosition(tarefa);
                      if (!position) return null;
                      
                      // Usar a mesma instância da tarefa atualizada para garantir consistência
                      const tarefaAtualizada = getTarefaAtualizada(tarefa);
                      // Capturar o estado atual da tarefa para usar na cor da barra
                      const estado = tarefaAtualizada.estado;
                      
                      return (
                        <div key={tarefa.id} className="h-10 relative group">
                          <div className="absolute inset-0 flex">
                            {months.map((month, index) => (
                              <div 
                                key={index} 
                                className="border-r border-slate-200/50 h-full" 
                                style={{ width: `${month.width}%` }}
                              />
                            ))}
                          </div>
                          
                          <motion.div
                            onClick={() => handleTarefaClick(tarefaAtualizada)}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            whileHover={{ y: -1 }}
                            style={{
                              position: 'absolute',
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                              height: '16px',
                              top: '50%',
                              marginTop: '0px',
                              transformOrigin: 'left',
                            }}
                            className={cn(
                              "cursor-pointer relative rounded-full transition-all duration-200",
                              estado 
                                ? "bg-gradient-to-r from-emerald-400/90 to-emerald-500/90 hover:from-emerald-500 hover:to-emerald-600 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.3)]" 
                                : "bg-gradient-to-r from-blue-400/90 to-blue-500/90 hover:from-blue-500 hover:to-blue-600 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.3)]",
                              "group-hover:shadow-[0_4px_12px_-4px_rgba(59,130,246,0.4)]"
                            )}
                          >
                            {tarefaAtualizada.entregaveis?.map((entregavel: EntregavelType) => {
                              if (!tarefaAtualizada.inicio || !tarefaAtualizada.fim || !entregavel.data) return null;
                              
                              // Calcular posição exata do entregável dentro da barra da tarefa
                              const entregavelPosition = getEntregavelExactPosition(
                                entregavel, 
                                new Date(tarefaAtualizada.inicio), 
                                new Date(tarefaAtualizada.fim)
                              );
                              
                              if (entregavelPosition === null) return null;
                              
                              return (
                                <div
                                  key={entregavel.id}
                                  className="absolute w-2 h-2 rounded-full bg-white shadow-sm z-20 flex items-center justify-center ring-4 ring-blue-500/20"
                                  style={{
                                    left: `${entregavelPosition}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                                </div>
                              );
                            })}
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!disableInteractions && (
        <>
          {selectedTarefa && (
            <MenuTarefa
              tarefaId={selectedTarefa}
              open={!!selectedTarefa}
              onClose={() => setSelectedTarefa(null)}
              onUpdate={handleTarefaUpdate}
            />
          )}

          {selectedWorkpackage && (
            <MenuWorkpackage
              workpackageId={selectedWorkpackage}
              onClose={() => setSelectedWorkpackage(null)}
              projetoId={projetoId}
              onUpdate={handleWorkpackageUpdate}
              open={!!selectedWorkpackage}
            />
          )}
        </>
      )}
    </div>
  );
}