import type { Workpackage, Tarefa } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { MenuTarefa } from "@/components/projetos/MenuTarefa";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MenuWorkpackage } from "@/components/projetos/MenuWorkpackage";
import { api } from "@/trpc/react";
import { motion } from "framer-motion";

interface CronogramaOptions {
  leftColumnWidth?: number;
  disableInteractions?: boolean;
  hideWorkpackageEdit?: boolean;
  compactMode?: boolean;
}

interface EntregavelType {
  id: string;
  nome: string;
  data: string;
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
  onUpdateWorkPackage?: (workpackage: Workpackage) => void;
  onUpdateTarefa?: (tarefa: Tarefa) => void;
  options?: CronogramaOptions;
}

export function Cronograma({ 
  workpackages, 
  startDate,
  endDate,
  onSelectTarefa,
  onUpdateWorkPackage,
  onUpdateTarefa,
  options = {}
}: CronogramaProps) {
  const [selectedTarefa, setSelectedTarefa] = useState<string | null>(null);
  const [selectedWorkpackage, setSelectedWorkpackage] = useState<string | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const utils = api.useContext();
  
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
  
  const getMonthsBetweenDates = (start: Date, end: Date) => {
    const months = [];
    const current = new Date(start);
    
    while (current <= end) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      months.push({
        label: format(current, "MMM/yy", { locale: ptBR }),
        date: new Date(current),
        days: daysInMonth
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };

  const months = getMonthsBetweenDates(startDate, endDate);
  const totalDays = months.reduce((acc, month) => acc + month.days, 0);
  
  const getMonthGridTemplate = () => {
    return months.map(month => `${month.days}fr`).join(" ");
  };

  const getDayPosition = (date: Date) => {
    const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSinceStart / totalDays) * 100;
  };

  const getTarefaPosition = (tarefa: TarefaWithEntregaveis) => {
    const tarefaStart = tarefa.inicio ? new Date(tarefa.inicio) : null;
    const tarefaEnd = tarefa.fim ? new Date(tarefa.fim) : null;
    
    if (!tarefaStart || !tarefaEnd) return null;
    
    const startPosition = getDayPosition(tarefaStart);
    const endPosition = getDayPosition(tarefaEnd);
    
    if (startPosition < 0 || endPosition > 100) return null;
    
    return {
      left: `${startPosition}%`,
      width: `${endPosition - startPosition}%`,
    };
  };

  const getCurrentDayPosition = () => {
    const today = new Date();
    if (today < startDate || today > endDate) return null;
    return getDayPosition(today);
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

  const getEntregaveisForMonth = (date: Date) => {
    const entregaveis: { entregavel: EntregavelType; tarefaId: string }[] = [];
    
    sortedWorkpackages.forEach((wp: WorkpackageWithTarefas) => {
      wp.tarefas.forEach((tarefa: TarefaWithEntregaveis) => {
        if (!tarefa.entregaveis?.length) return;
        
        tarefa.entregaveis.forEach(entregavel => {
          const entregavelDate = new Date(entregavel.data);
          if (entregavelDate.getMonth() === date.getMonth() && 
              entregavelDate.getFullYear() === date.getFullYear()) {
            entregaveis.push({ entregavel, tarefaId: tarefa.id });
          }
        });
      });
    });
    
    return entregaveis;
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
                      {wp.tarefas.filter(t => t.estado).length}/{wp.tarefas.length}
                    </span>
                  </div>
                </div>
                {sortTarefas(wp.tarefas).map((tarefa) => (
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
                            ? "bg-emerald-500 border-emerald-500" 
                            : "border-blue-500 group-hover/task:border-blue-600"
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
                ))}
              </div>
            ))}
          </div>
        </div>

        <div 
          ref={timelineRef} 
          className="overflow-x-auto flex-1 overflow-y-scroll scrollbar-none bg-slate-50/30"
        >
          <div className="h-full w-full relative">
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
              <div className="grid w-full" style={{ gridTemplateColumns: getMonthGridTemplate() }}>
                {months.map((month) => {
                  const entregaveisNoMes = getEntregaveisForMonth(month.date);
                  return (
                    <div 
                      key={month.label}
                      className="relative py-3 px-4 text-center border-r border-slate-200/70"
                    >
                      <div className="text-xs font-medium text-slate-600">
                        {month.label}
                      </div>
                      {entregaveisNoMes.length > 0 && (
                        <div className="absolute bottom-1 left-1 right-1 flex">
                          {entregaveisNoMes.map(({ entregavel }) => {
                            const entregavelDate = new Date(entregavel.data);
                            const position = getDayPosition(entregavelDate);
                            
                            return (
                              <div 
                                key={entregavel.id}
                                className="absolute w-1 h-1 rounded-full bg-blue-500/70"
                                style={{
                                  left: `${position}%`
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      <div className="absolute inset-0 grid w-full" 
                        style={{ gridTemplateColumns: getMonthGridTemplate() }}
                      >
                        {months.map((_, i) => (
                          <div key={i} className="border-r border-slate-200/50 h-full" />
                        ))}
                      </div>
                    </div>

                    {sortTarefas(wp.tarefas).map((tarefa) => {
                      const position = getTarefaPosition(tarefa);
                      if (!position) return null;
                      
                      return (
                        <div key={tarefa.id} className="h-10 relative group">
                          <div className="absolute inset-0 grid w-full" 
                            style={{ gridTemplateColumns: getMonthGridTemplate() }}
                          >
                            {months.map((_, i) => (
                              <div key={i} className="border-r border-slate-200/50 h-full" />
                            ))}
                          </div>
                          
                          <motion.div
                            onClick={() => handleTarefaClick(tarefa)}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            whileHover={{ y: -1 }}
                            style={{
                              position: 'absolute',
                              left: position.left,
                              width: position.width,
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
                              "group-hover:shadow-[0_4px_12px_-4px_rgba(59,130,246,0.4)]"
                            )}
                          >
                            {tarefa.entregaveis?.map((entregavel) => {
                              if (!tarefa.inicio || !tarefa.fim) return null;
                              const entregavelDate = new Date(entregavel.data);
                              const tarefaStart = new Date(tarefa.inicio);
                              const tarefaEnd = new Date(tarefa.fim);
                              
                              const tarefaDays = Math.floor((tarefaEnd.getTime() - tarefaStart.getTime()) / (1000 * 60 * 60 * 24));
                              const daysSinceTarefaStart = Math.floor((entregavelDate.getTime() - tarefaStart.getTime()) / (1000 * 60 * 60 * 24));
                              const percentage = (daysSinceTarefaStart / tarefaDays) * 100;
                              
                              return (
                                <div
                                  key={entregavel.id}
                                  className="absolute w-2 h-2 rounded-full bg-white shadow-sm z-20 flex items-center justify-center ring-4 ring-blue-500/20"
                                  style={{
                                    left: `${percentage}%`,
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
              onUpdate={async () => {
                await Promise.all([
                  utils.tarefa.getById.invalidate(selectedTarefa),
                  utils.projeto.getById.invalidate(),
                  utils.workpackage.getById.invalidate()
                ]);

                if (onUpdateTarefa) {
                  const tarefa = await utils.tarefa.getById.fetch(selectedTarefa);
                  if (tarefa) {
                    await onUpdateTarefa(tarefa);
                  }
                }
              }}
            />
          )}

          {selectedWorkpackage && (
            <MenuWorkpackage
              workpackageId={selectedWorkpackage}
              open={!!selectedWorkpackage}
              onClose={() => setSelectedWorkpackage(null)}
              startDate={startDate}
              endDate={endDate}
              onUpdate={async () => {
                await Promise.all([
                  utils.workpackage.getById.invalidate({ id: selectedWorkpackage }),
                  utils.projeto.getById.invalidate()
                ]);

                if (onUpdateWorkPackage) {
                  const workpackage = await utils.workpackage.getById.fetch({ id: selectedWorkpackage });
                  if (workpackage) {
                    await onUpdateWorkPackage(workpackage);
                  }
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}