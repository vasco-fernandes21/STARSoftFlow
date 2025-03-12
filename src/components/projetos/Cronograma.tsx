import type { Workpackage, Tarefa } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { MenuTarefa } from "@/components/projetos/MenuTarefa";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MenuWorkpackage } from "@/components/projetos/MenuWorkpackage";
import { api } from "@/trpc/react";

interface CronogramaOptions {
  leftColumnWidth?: number;
  disableInteractions?: boolean;
  hideWorkpackageEdit?: boolean;
  compactMode?: boolean;
}

interface CronogramaProps {
  workpackages: (Workpackage & { tarefas: Tarefa[] })[];
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
      months.push({
        label: format(current, "MMM/yy", { locale: ptBR }),
        date: new Date(current),
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };

  const months = getMonthsBetweenDates(startDate, endDate);

  const getCurrentDayPosition = () => {
    const today = new Date();
    if (today < startDate || today > endDate) return null;

    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const percentage = (daysSinceStart / totalDays) * 100;

    return percentage;
  };

  const getTarefaPosition = (tarefa: Tarefa) => {
    const tarefaStart = tarefa.inicio ? new Date(tarefa.inicio) : null;
    const tarefaEnd = tarefa.fim ? new Date(tarefa.fim) : null;
    
    if (!tarefaStart || !tarefaEnd) return null;
    
    const startDiff = (tarefaStart.getFullYear() - startDate.getFullYear()) * 12 + 
                     (tarefaStart.getMonth() - startDate.getMonth());
    const endDiff = (tarefaEnd.getFullYear() - startDate.getFullYear()) * 12 + 
                   (tarefaEnd.getMonth() - startDate.getMonth());
    
    const duration = endDiff - startDiff + 1;
    
    if (startDiff < 0 || endDiff >= months.length) return null;
    
    return {
      gridColumnStart: startDiff + 2,
      gridColumnEnd: `span ${duration}`,
    };
  };

  const handleTarefaClick = (tarefa: Tarefa) => {
    if (disableInteractions) return;
    setSelectedTarefa(tarefa.id);
    if (onSelectTarefa) onSelectTarefa(tarefa.id);
  };

  const sortTarefas = (tarefas: Tarefa[]) => {
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

  return (
    <div className="flex h-full w-full">
      <div className="flex w-full h-full overflow-hidden">
        <div 
          ref={leftColumnRef} 
          className="flex-shrink-0 sticky left-0 bg-white/70 backdrop-blur-sm z-20 border-r border-white/30 overflow-y-scroll scrollbar-none"
          style={{ 
            width: `${leftColumnWidth}px`,
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          <div className={cn(
            "sticky top-0 px-6 border-b border-white/30 bg-white/70 backdrop-blur-sm z-20",
            compactMode ? "py-2" : "py-4"
          )}>
            <div className="text-xs font-medium text-gray-500">
              Workpackage/Tarefa
            </div>
          </div>
          <div className="py-2">
            {sortedWorkpackages.map((wp) => (
              <div key={wp.id}>
                <div 
                  className={cn(
                    "flex items-center px-6 cursor-pointer hover:bg-blue-50/50 transition-colors",
                    compactMode ? "h-[30px]" : "h-[36px]"
                  )}
                  onClick={() => {
                    if (!disableInteractions) {
                      setSelectedWorkpackage(wp.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <h3 
                      className="text-base font-semibold text-gray-700 flex items-center gap-2 truncate"
                      style={{ maxWidth: `${leftColumnWidth - 60}px` }}
                    >
                      {wp.nome}
                    </h3>
                    <Badge className="bg-blue-50/70 text-customBlue border-blue-200 text-[10px] px-2 py-0.5 backdrop-blur-sm shadow-sm flex-shrink-0">
                      {wp.tarefas.length}
                    </Badge>
                  </div>
                </div>
                {sortTarefas(wp.tarefas).map((tarefa) => (
                  <div 
                    key={tarefa.id} 
                    className={cn(
                      "flex items-center px-6 cursor-pointer hover:bg-blue-50/50 transition-colors",
                      compactMode ? "h-[40px]" : "h-[48px]"
                    )}
                    onClick={() => handleTarefaClick(tarefa)}
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="text-sm font-medium text-gray-600 truncate"
                          style={{ maxWidth: `${leftColumnWidth - 100}px` }}
                        >
                          {tarefa.nome}
                        </span>
                        <Badge className={cn(
                          'text-[10px] px-2 py-0.5 whitespace-nowrap font-medium backdrop-blur-sm shadow-sm flex-shrink-0',
                          tarefa.estado
                            ? 'bg-emerald-50/70 text-emerald-600 border-emerald-200' 
                            : 'bg-blue-50/70 text-customBlue border-blue-200'
                        )}>
                          {tarefa.estado ? 'Concluído' : 'Em Progresso'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div 
          ref={timelineRef} 
          className="overflow-x-auto flex-1 overflow-y-scroll scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="inline-block min-w-max relative">
            <div className="sticky top-0 bg-white/70 backdrop-blur-sm border-b border-white/30 shadow-sm z-10">
              <div className="grid gap-1 px-4 py-4" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(80px, 1fr))` }}>
                {months.map((month) => (
                  <div key={month.label} className="text-xs font-medium text-gray-500 text-center">
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="py-2 relative">
              {/* Barra vertical do dia atual */}
              {currentDayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 to-blue-300/20 z-10 transition-all duration-300"
                  style={{ left: `${currentDayPosition}%` }}
                >
                  <div 
                    className="absolute top-0 w-3 h-3 bg-blue-500 rounded-full shadow-md -translate-x-[5px] -translate-y-1.5 hover:scale-125 transition-transform duration-200"
                  />
                </div>
              )}

              {sortedWorkpackages.map((wp) => (
                <div key={wp.id}>
                  <div className="h-[36px]"></div>
                  {sortTarefas(wp.tarefas).map((tarefa) => {
                    const position = getTarefaPosition(tarefa);
                    if (!position) return null;
                    
                    const duration = parseInt(position.gridColumnEnd.split(' ')[1] || '1');
                    
                    return (
                      <div key={tarefa.id} className="h-[48px] px-4 flex items-center">
                        <div className="relative w-full h-8">
                          <div className="absolute inset-0 grid gap-1 opacity-10" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
                            {Array.from({ length: months.length }).map((_, i) => (
                              <div key={i} className="border-l border-gray-300 h-full" />
                            ))}
                          </div>
                          <div
                            onClick={() => handleTarefaClick(tarefa)}
                            className={cn(
                              "absolute h-6 rounded-full transition-all duration-300 cursor-pointer",
                              tarefa.estado
                                ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-300/30 hover:from-emerald-200 hover:to-emerald-100' 
                                : 'bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-300/30 hover:from-blue-200 hover:to-blue-100',
                              "top-1/2 -translate-y-1/2 shadow-md hover:shadow-lg hover:h-7"
                            )}
                            style={{
                              left: `${((position.gridColumnStart - 2) / months.length) * 100}%`,
                              width: `${(duration / months.length) * 100}%`,
                              minWidth: '40px'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
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