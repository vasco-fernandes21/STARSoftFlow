import React, { useState, useRef, useEffect, Fragment } from "react";
import type { Workpackage, Tarefa } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MenuTarefa } from "@/components/projetos/MenuTarefa";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MenuWorkpackage } from "@/components/projetos/MenuWorkpackage";
import { api } from "@/trpc/react";
import { motion } from "framer-motion";
import { CalendarDays, Check, Flag, AlertCircle } from "lucide-react";

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-full bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="flex w-full h-full">
        <div 
          ref={leftColumnRef} 
          className="flex-shrink-0 sticky left-0 bg-white z-20 overflow-y-scroll scrollbar-none border-r border-gray-100"
          style={{ width: `${leftColumnWidth}px` }}
        >
          <div className="sticky top-0 px-4 bg-white z-20 py-3 border-b border-gray-100">
            <div className="text-xs text-gray-500 font-medium">
              Workpackages / Tarefas
            </div>
          </div>

          <div className="py-2">
            {sortedWorkpackages.map((wp, index) => (
              <motion.div 
                key={wp.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="mb-1"
              >
                <div 
                  className={cn(
                    "group px-4 py-2 cursor-pointer hover:bg-gray-50 border-l-2 border-transparent",
                    "hover:border-azul transition-all duration-150"
                  )}
                  onClick={() => !disableInteractions && setSelectedWorkpackage(wp.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <div className="w-2 h-2 rounded-sm bg-azul/80 flex-shrink-0" />
                      <h3 className="text-sm font-medium text-gray-800 truncate">
                        {wp.nome}
                      </h3>
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      {wp.tarefas.filter(t => t.estado).length}/{wp.tarefas.length}
                    </div>
                  </div>
                </div>

                <div>
                  {sortTarefas(wp.tarefas).map((tarefa) => (
                    <motion.div 
                      key={tarefa.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "group px-4 py-1.5 pl-6 cursor-pointer",
                        "hover:bg-gray-50 transition-colors duration-150",
                        "border-l-2 border-transparent hover:border-gray-200"
                      )}
                      onClick={() => handleTarefaClick(tarefa)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0",
                          tarefa.estado 
                            ? "border-emerald-400 bg-emerald-50" 
                            : "border-gray-300 bg-white"
                        )}>
                          {tarefa.estado && <Check className="w-2 h-2 text-emerald-500" />}
                        </div>
                        <span className={cn(
                          "text-xs truncate max-w-[180px]",
                          tarefa.estado ? "text-gray-400 line-through" : "text-gray-700"
                        )}>
                          {tarefa.nome}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div 
          ref={timelineRef} 
          className="overflow-x-auto flex-1 overflow-y-scroll scrollbar-none bg-gray-50"
        >
          <div className="inline-block min-w-max relative">
            <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
              <div className="grid" 
                style={{ gridTemplateColumns: `repeat(${months.length}, minmax(90px, 1fr))` }}
              >
                {months.map((month) => (
                  <div 
                    key={month.label}
                    className="text-xs text-gray-500 py-3 px-2 text-center border-r border-gray-100"
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {currentDayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-azul z-10"
                  style={{ left: `${currentDayPosition}%` }}
                >
                  <div className="absolute -top-1 w-2 h-2 bg-azul rounded-full -translate-x-1/2" />
                </div>
              )}

              <div className="relative z-0">
                {sortedWorkpackages.map((wp, wpIndex) => {
                  const wpPosition = getTarefaPosition({
                    inicio: wp.inicio,
                    fim: wp.fim
                  } as Tarefa);
                  
                  const tarefasConcluidas = wp.tarefas.filter(t => t.estado).length;
                  const totalTarefas = wp.tarefas.length;
                  const progress = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0;

                  return (
                    <div key={wp.id} className="relative">
                      <div className="h-9 relative flex items-center">
                        {wpPosition && (
                          <div className="absolute inset-0 grid" 
                            style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}
                          >
                            {Array.from({ length: months.length }).map((_, i) => {
                              const currentMonth = new Date().getMonth();
                              const currentYear = new Date().getFullYear();
                              const monthDate = new Date(startDate);
                              monthDate.setMonth(startDate.getMonth() + i);
                              
                              const isCurrentMonth = monthDate.getMonth() === currentMonth && 
                                                     monthDate.getFullYear() === currentYear;
                              
                              return (
                                <div key={i} className={cn(
                                  "border-r h-full",
                                  isCurrentMonth ? "bg-azul/5" : ""
                                )} />
                              );
                            })}
                            
                            <div
                              style={{
                                position: 'absolute',
                                left: `${((wpPosition.gridColumnStart - 2) / months.length) * 100}%`,
                                width: `${(parseInt(wpPosition.gridColumnEnd.split(' ')[1]) / months.length) * 100}%`,
                                height: '6px',
                                top: '50%',
                                marginTop: '-3px',
                                borderRadius: '3px',
                                background: '#eee',
                              }}
                              className="shadow-sm overflow-hidden"
                            >
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-azul"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {sortTarefas(wp.tarefas).map((tarefa) => {
                        const position = getTarefaPosition(tarefa);
                        if (!position) return null;
                        
                        const duration = parseInt(position.gridColumnEnd.split(' ')[1] || '1');
                        const isEntregavel = tarefa.nome.toLowerCase().includes('entrega') || 
                                            tarefa.nome.toLowerCase().includes('milestone');
                        
                        return (
                          <div key={tarefa.id} className="h-7 relative">
                            <div className="absolute inset-0 grid" 
                              style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}
                            >
                              {Array.from({ length: months.length }).map((_, i) => (
                                <div key={i} className="border-r border-gray-100 h-full" />
                              ))}
                            </div>
                            
                            {isEntregavel ? (
                              <motion.div
                                onClick={() => handleTarefaClick(tarefa)}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                style={{
                                  position: 'absolute',
                                  left: `${((position.gridColumnStart - 2) / months.length) * 100}%`,
                                  top: '50%',
                                  marginTop: '-8px',
                                }}
                                className="group cursor-pointer"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center",
                                  tarefa.estado 
                                    ? "bg-emerald-500 text-white" 
                                    : "bg-azul/80 text-white"
                                )}>
                                  <Flag className="w-2.5 h-2.5" />
                                </div>
                                
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-0 bg-gray-900 text-white text-xs p-1.5 rounded-md shadow-md whitespace-nowrap z-50 transition-opacity">
                                  <div className="font-medium flex items-center gap-1">
                                    <Flag className="w-3 h-3" /> {tarefa.nome}
                                  </div>
                                  <div className="text-gray-300 text-[10px] mt-0.5">
                                    {format(new Date(tarefa.inicio!), "dd/MM/yy")} — {format(new Date(tarefa.fim!), "dd/MM/yy")}
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                onClick={() => handleTarefaClick(tarefa)}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                whileHover={{ y: -1 }}
                                style={{
                                  position: 'absolute',
                                  left: `${((position.gridColumnStart - 2) / months.length) * 100}%`,
                                  width: `${(duration / months.length) * 100}%`,
                                  height: '4px',
                                  top: '50%',
                                  marginTop: '-2px',
                                  transformOrigin: 'left',
                                  borderRadius: '2px',
                                }}
                                className={cn(
                                  "cursor-pointer group",
                                  tarefa.estado ? "bg-emerald-400" : "bg-azul/70"
                                )}
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 -left-1 bg-gray-900 text-white text-xs p-1.5 rounded-md shadow-md whitespace-nowrap z-50 transition-opacity">
                                  <div className="font-medium">{tarefa.nome}</div>
                                  <div className="text-gray-300 text-[10px] mt-0.5">
                                    {format(new Date(tarefa.inicio!), "dd/MM/yy")} — {format(new Date(tarefa.fim!), "dd/MM/yy")}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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
    </motion.div>
  );
}