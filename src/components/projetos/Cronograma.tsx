import type { Workpackage, Tarefa } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useMemo } from "react";
import { MenuTarefa } from "@/components/projetos/menus/tarefa";
import { format, getDaysInMonth, differenceInDays, isWithinInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { MenuWorkpackage } from "@/components/projetos/menus/workpackage";
import { useMutations } from "@/hooks/useMutations";
import { WorkpackageCompleto, ProjetoCompleto } from "./types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  estado?: boolean;
}

interface TarefaWithEntregaveis extends Tarefa {
  entregaveis?: EntregavelType[];
}

interface WorkpackageWithTarefas extends Workpackage {
  tarefas: TarefaWithEntregaveis[];
  materiais: any[];
  recursos: {
    userId: string;
    mes: number;
    ano: number;
    ocupacao: string | number | any;
    user: {
      id: string;
      name: string | null;
      salario: string | number | null;
    };
  }[];
}

interface CronogramaProps {
  projeto: ProjetoCompleto;
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
  projeto,
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
  const [isLeftColumnCollapsed, setIsLeftColumnCollapsed] = useState(false);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const mutations = useMutations(projetoId);
  
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

  const effectiveLeftColumnWidth = isLeftColumnCollapsed ? 40 : leftColumnWidth;

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

  return (
    <div className="flex h-full w-full">
      <div className="flex w-full h-full overflow-hidden">
        <motion.div 
          ref={leftColumnRef} 
          className="flex-shrink-0 sticky left-0 bg-white z-20 border-r border-slate-200/50 overflow-y-scroll scrollbar-none"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
          animate={{
            width: effectiveLeftColumnWidth
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="sticky top-0 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 z-20 flex items-center justify-between">
            {!isLeftColumnCollapsed && (
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center">
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">Workpackage/Tarefa</span>
              </div>
            )}
            <button
              onClick={() => setIsLeftColumnCollapsed(!isLeftColumnCollapsed)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors ml-auto"
            >
              {isLeftColumnCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          
          {!isLeftColumnCollapsed && (
            <div className="py-1">
              {sortedWorkpackages.map((wp, index) => (
                <div key={wp.id} className={cn("group/wp", index === 0 && "border-t border-slate-100/50")}>
                  <div 
                    className={cn(
                      "flex items-center px-4 cursor-pointer hover:bg-slate-50/80 transition-colors bg-slate-50/30",
                      "h-10 border-l-2 border-l-transparent hover:border-l-blue-500 group-hover/wp:border-l-blue-500/50",
                      "transition-all duration-200"
                    )}
                    onClick={() => {
                      if (!disableInteractions) {
                        setSelectedWorkpackage(wp.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 
                        className="text-sm font-medium text-slate-700 truncate group-hover/wp:text-slate-900"
                        style={{ maxWidth: `${leftColumnWidth - 80}px` }}
                      >
                        {wp.nome}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-500 group-hover/wp:bg-blue-50 group-hover/wp:text-blue-600 transition-colors">
                        {wp.tarefas.filter(t => t.estado).length}/{wp.tarefas.length}
                      </span>
                    </div>
                  </div>
                  {sortTarefas(wp.tarefas).map((tarefa) => {
                    return (
                      <div 
                        key={tarefa.id} 
                        className={cn(
                          "flex items-center px-4 cursor-pointer hover:bg-slate-50/80 transition-colors border-t border-slate-100/50",
                          "h-10"
                        )}
                        onClick={() => handleTarefaClick(tarefa)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div 
                            className={cn(
                              "w-2 h-2 rounded-full border transition-colors flex-shrink-0",
                              tarefa.estado 
                                ? "bg-emerald-500 border-emerald-500 ring-2 ring-emerald-100" 
                                : "border-blue-500 ring-2 ring-blue-100 group-hover/task:border-blue-600"
                            )}
                          />
                          <span 
                            className="text-sm text-slate-600 truncate group-hover/task:text-slate-900 transition-colors"
                            style={{ maxWidth: `${leftColumnWidth - 48}px` }}
                          >
                            {tarefa.nome}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </motion.div>

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
                    <div className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md inline-block">
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
                      
                      <div className="absolute left-2 flex items-center h-full">
                        <div className="text-xs font-medium text-slate-400 bg-slate-50/90 px-2 py-0.5 rounded-full">
                          {wp.nome}
                        </div>
                      </div>
                    </div>

                    {sortTarefas(wp.tarefas).map((tarefa) => {
                      const position = getTarefaPosition(tarefa);
                      if (!position) return null;
                      
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
                            onClick={() => handleTarefaClick(tarefa)}
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
                              tarefa.estado 
                                ? "bg-gradient-to-r from-emerald-400/90 to-emerald-500/90 hover:from-emerald-500 hover:to-emerald-600 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.3)]" 
                                : "bg-gradient-to-r from-blue-400/90 to-blue-500/90 hover:from-blue-500 hover:to-blue-600 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.3)]",
                              "group-hover:shadow-[0_4px_12px_-4px_rgba(59,130,246,0.4)]",
                              "backdrop-blur-sm"
                            )}
                          >
                            {tarefa.entregaveis?.map((entregavel: EntregavelType) => {
                              if (!tarefa.inicio || !tarefa.fim || !entregavel.data) return null;
                              
                              // Calcular posição exata do entregável dentro da barra da tarefa
                              const entregavelPosition = getEntregavelExactPosition(
                                entregavel, 
                                new Date(tarefa.inicio), 
                                new Date(tarefa.fim)
                              );
                              
                              if (entregavelPosition === null) return null;
                              
                              const entregavelDate = new Date(entregavel.data);
                              const isPastDue = entregavelDate < new Date();
                              
                              // Usar o estado do próprio entregável
                              const isCompleted = entregavel.estado;
                              
                              // Permitir clicar no entregável para alternar seu estado (se interações estiverem habilitadas)
                              const handleEntregavelClick = (e: React.MouseEvent) => {
                                if (disableInteractions) return;
                                e.stopPropagation(); // Evitar propagar o clique para a tarefa pai
                                
                                // Usar o update para alterar o estado
                                mutations.entregavel.update.mutate({
                                  id: entregavel.id,
                                  data: { estado: !entregavel.estado }
                                });
                              };
                              
                              // Estilo visual que corresponde ao componente EntregavelItem
                              return (
                                <div
                                  key={entregavel.id}
                                  onClick={handleEntregavelClick}
                                  className={cn(
                                    "absolute z-20 cursor-pointer",
                                    "w-3 h-3 rounded-full",
                                    "transition-all duration-150",
                                    "flex items-center justify-center",
                                    "hover:-translate-y-[1px]",
                                    isCompleted 
                                      ? "bg-white shadow-[0_0_0_2px_rgba(16,185,129,0.6)]" 
                                      : isPastDue 
                                        ? "bg-white shadow-[0_0_0_2px_rgba(239,68,68,0.6)]" 
                                        : "bg-white shadow-[0_0_0_2px_rgba(59,130,246,0.6)]"
                                  )}
                                  style={{
                                    left: `${entregavelPosition}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    isCompleted 
                                      ? "bg-emerald-500" 
                                      : isPastDue 
                                        ? "bg-red-500" 
                                        : "bg-blue-500"
                                  )} />
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
              onUpdate={async (data, workpackageId) => {
                if (onUpdateTarefa) await onUpdateTarefa();
              }}
            />
          )}

          {selectedWorkpackage && (
            <MenuWorkpackage
              workpackageId={selectedWorkpackage}
              onClose={() => setSelectedWorkpackage(null)}
              projetoId={projetoId}
              onUpdate={async () => {
                if (onUpdateWorkPackage) await onUpdateWorkPackage();
              }}
              open={!!selectedWorkpackage}
              projeto={projeto}
              workpackage={workpackages.find(wp => wp.id === selectedWorkpackage) as any}
            />
          )}
        </>
      )}
    </div>
  );
}