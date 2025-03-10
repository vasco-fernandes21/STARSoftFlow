import type { Workpackage, Tarefa } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { MenuTarefa } from "@/components/projetos/MenuTarefa";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MenuWorkpackage } from "@/components/projetos/MenuWorkpackage";

interface CronogramaProps {
  workpackages: (Workpackage & { tarefas: Tarefa[] })[];
  startDate: Date;
  endDate: Date;
  onSelectTarefa?: (tarefaId: string) => void;
  onUpdateWorkPackage?: (workpackage: Workpackage) => void;
  onUpdateTarefa?: (tarefa: Tarefa) => void;
}

export function Cronograma({ 
  workpackages, 
  startDate,
  endDate,
  onSelectTarefa,
  onUpdateWorkPackage,
  onUpdateTarefa
}: CronogramaProps) {
  const [selectedTarefa, setSelectedTarefa] = useState<string | null>(null);
  const [selectedWorkpackage, setSelectedWorkpackage] = useState<string | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Sincronizar scroll entre as colunas
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
  
  // Gerar array de meses entre as datas
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

  // Calcular posição da tarefa na timeline
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
    setSelectedTarefa(tarefa.id);
    if (onSelectTarefa) onSelectTarefa(tarefa.id);
  };

  // Ordenar tarefas por data de início
  const sortTarefas = (tarefas: Tarefa[]) => {
    return [...tarefas].sort((a, b) => {
      const dateA = a.inicio ? new Date(a.inicio) : new Date(0);
      const dateB = b.inicio ? new Date(b.inicio) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex w-full h-full overflow-hidden">
        {/* Coluna fixa da esquerda */}
        <div 
          ref={leftColumnRef} 
          className="w-[300px] flex-shrink-0 sticky left-0 bg-white/70 backdrop-blur-sm z-20 border-r border-white/30 overflow-y-scroll scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Garante que a barra seja ocultada
        >
          {/* Cabeçalho da coluna fixa */}
          <div className="sticky top-0 px-6 py-4 border-b border-white/30 bg-white/70 backdrop-blur-sm z-20">
            <div className="text-xs font-medium text-gray-500">
              Workpackage/Tarefa
            </div>
          </div>
          
          {/* Lista de Workpackages e Tarefas */}
          <div className="py-2">
            {workpackages.map((wp) => (
              <div key={wp.id}>
                {/* Cabeçalho do Workpackage */}
                <div className="h-[36px] flex items-center px-6">
                  <div className="flex items-center gap-2 w-full">
                    <h3 
                      className="text-base font-semibold text-gray-700 cursor-pointer hover:text-customBlue transition-colors flex items-center gap-2 truncate max-w-[280px]"
                      onClick={() => setSelectedWorkpackage(wp.id)}
                    >
                      {wp.nome}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-gray-400 hover:text-customBlue hover:bg-blue-50 flex-shrink-0"
                        onClick={() => onUpdateWorkPackage?.(wp)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </h3>
                    <Badge className="bg-blue-50/70 text-customBlue border-blue-200 text-[10px] px-2 py-0.5 backdrop-blur-sm shadow-sm flex-shrink-0">
                      {wp.tarefas.length}
                    </Badge>
                  </div>
                </div>

                {/* Lista de Tarefas */}
                {sortTarefas(wp.tarefas).map((tarefa) => (
                  <div key={tarefa.id} className="h-[48px] flex items-center px-6">
                    <div
                      className="cursor-pointer w-full"
                      onClick={() => handleTarefaClick(tarefa)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-600 hover:text-customBlue transition-colors truncate max-w-[260px] hover:font-semibold">
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

        {/* Área scrollável da Timeline */}
        <div 
          ref={timelineRef} 
          className="overflow-x-auto flex-1 overflow-y-scroll scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Garante que a barra seja ocultada
        >
          <div className="inline-block min-w-max">
            {/* Cabeçalho dos meses */}
            <div className="sticky top-0 bg-white/70 backdrop-blur-sm border-b border-white/30 shadow-sm z-10">
              <div className="grid gap-1 px-4 py-4" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(80px, 1fr))` }}>
                {months.map((month) => (
                  <div key={month.label} className="text-xs font-medium text-gray-500 text-center">
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Barras da Timeline */}
            <div className="py-2">
              {workpackages.map((wp) => (
                <div key={wp.id}>
                  <div className="h-[36px]"></div>
                  {sortTarefas(wp.tarefas).map((tarefa) => {
                    const position = getTarefaPosition(tarefa);
                    if (!position) return null;
                    
                    const duration = parseInt(position.gridColumnEnd.split(' ')[1] || '1');
                    
                    return (
                      <div key={tarefa.id} className="h-[48px] px-4 flex items-center">
                        <div className="relative w-full h-8">
                          {/* Linhas de grid */}
                          <div className="absolute inset-0 grid gap-1 opacity-10" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
                            {Array.from({ length: months.length }).map((_, i) => (
                              <div key={i} className="border-l border-gray-300 h-full" />
                            ))}
                          </div>

                          {/* Barra da tarefa */}
                          <div
                            className={cn(
                              "absolute h-6 rounded-full transition-all duration-300",
                              tarefa.estado
                                ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-300/30' 
                                : 'bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-300/30',
                              "top-1/2 -translate-y-1/2 shadow-md group-hover:shadow-lg group-hover:h-7"
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

      {/* Menu da Tarefa */}
      {selectedTarefa && (
        <MenuTarefa
          tarefaId={selectedTarefa}
          open={!!selectedTarefa}
          onClose={() => setSelectedTarefa(null)}
        />
      )}

      {selectedWorkpackage && (
        <MenuWorkpackage
          workpackageId={selectedWorkpackage}
          open={!!selectedWorkpackage}
          onClose={() => setSelectedWorkpackage(null)}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}