import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon, PencilIcon, FileIcon, Calendar, Clock, Activity } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UseMutationResult } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

// Componente de círculo de progresso
function ProgressCircle({
  value,
  size = "md",
  showValue = false,
  strokeWidth = 4,
  className,
  valueClassName
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  strokeWidth?: number;
  className?: string;
  valueClassName?: string;
}) {
  // Assegurar que o valor está entre 0 e 100
  const safeValue = Math.max(0, Math.min(100, value));
  
  // Calcular tamanho do círculo baseado no tamanho escolhido
  const sizes = {
    sm: 40,
    md: 64,
    lg: 80
  };
  
  const circleSize = sizes[size];
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeValue / 100) * circumference;
  
  // Determinar a cor baseada no valor
  const getColorClass = () => {
    if (safeValue < 25) return "stroke-red-500";
    if (safeValue < 50) return "stroke-orange-500";
    if (safeValue < 75) return "stroke-azul";
    return "stroke-green-500";
  };
  
  return (
    <div 
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: circleSize, height: circleSize }}
    >
      {/* Círculo de fundo */}
      <svg 
        className="absolute"
        width={circleSize} 
        height={circleSize}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
      >
        <circle
          className="stroke-azul/10"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
      </svg>
      
      {/* Círculo de progresso */}
      <svg 
        className="absolute transform -rotate-90"
        width={circleSize} 
        height={circleSize}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
      >
        <circle
          className={getColorClass()}
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      
      {/* Texto de porcentagem */}
      {showValue && (
        <div className={cn("text-xs font-medium flex items-center justify-center", valueClassName)}>
          {safeValue}%
        </div>
      )}
    </div>
  );
}

// Campo de texto personalizável para edição de nome
function EditableField({
  value, 
  onChange, 
  onSave, 
  onCancel, 
  isEditing, 
  setIsEditing,
  label,
  placeholder = "Digite aqui...",
  className
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return isEditing ? (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-azul/80">{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-azul/20 focus:border-azul focus:ring-1 focus:ring-azul/30 pr-20 py-2 rounded-lg"
            placeholder={placeholder}
            autoFocus
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="h-7 w-7 rounded-full bg-green-50 text-green-600 hover:bg-green-100 mr-1"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-azul/80">{label}</Label>
      <div 
        onClick={() => setIsEditing(true)}
        className="flex items-center justify-between p-2 border border-transparent hover:border-azul/20 rounded-lg cursor-pointer group transition-all duration-200"
      >
        <div className="text-base font-medium text-gray-900">{value || placeholder}</div>
        <PencilIcon className="h-4 w-4 text-gray-400 group-hover:text-azul transition-colors" />
      </div>
    </div>
  );
}

interface WorkpackageInformacoesProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  onClose: () => void;
  onUpdate?: () => Promise<void>;
  mutations?: {
    updateWorkpackage?: UseMutationResult<any, unknown, any, unknown>;
  };
}

export function WorkpackageInformacoes({ 
  workpackage,
  workpackageId, 
  onClose, 
  onUpdate,
  mutations
}: WorkpackageInformacoesProps) {
  // estados locais
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(workpackage.nome || "");
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState(workpackage.descricao || "");

  // setup do TanStack Query
  const queryClient = useQueryClient();
  
  // Mutações internas ou recebidas por props
  const localUpdateMutation = api.workpackage.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage"] });
      queryClient.invalidateQueries({ queryKey: ["projeto"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success("Workpackage atualizado com sucesso");
      
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar workpackage");
    }
  });
  
  // Usar mutação do pai ou a local
  const updateMutation = mutations?.updateWorkpackage || localUpdateMutation;
  
  // Função para lidar com mudanças de data
  const handleDateChange = async (field: 'inicio' | 'fim', date: Date | undefined) => {
    try {
      await updateMutation.mutateAsync({
        id: workpackageId,
        [field]: date
      });
      
      if (onUpdate) {
        await onUpdate();
      }
      
      toast.success(`Data de ${field === 'inicio' ? 'início' : 'fim'} atualizada com sucesso`);
    } catch (error) {
      toast.error(`Erro ao atualizar data de ${field === 'inicio' ? 'início' : 'fim'}`);
    }
  };
  
  // handlers
  const handleNameSave = () => {
    if (!newName.trim()) {
      toast.error("O nome não pode estar vazio");
      return;
    }
    
    updateMutation.mutate({
      id: workpackageId,
      nome: newName
    });
    
    setEditingName(false);
  };
  
  const handleDescriptionSave = () => {
    updateMutation.mutate({
      id: workpackageId,
      descricao: newDescription
    });
    
    setEditingDescription(false);
  };
  
  // calcular estatísticas
  const tarefasConcluidas = workpackage.tarefas?.filter(t => t.estado)?.length || 0;
  const totalTarefas = workpackage.tarefas?.length || 0;
  const porcentagemConcluido = totalTarefas ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;
  
  // calcular duração em dias
  const calcularDuracaoDias = () => {
    if (!workpackage.inicio || !workpackage.fim) return 0;
    
    const inicio = new Date(workpackage.inicio);
    const fim = new Date(workpackage.fim);
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final
  };
  
  // Renderização condicional para estado de carregamento
  if (!workpackage) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-500">Workpackage não encontrado</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-azul">Informações</h2>
          <p className="text-sm text-azul/60 mt-1">Detalhes e configurações do workpackage</p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setEditingName(true)}
          className="h-10 border-azul/20 text-azul hover:bg-azul/10"
        >
          <PencilIcon className="h-4 w-4 mr-2" />
          Editar Nome
        </Button>
      </div>
      
      {/* Resumo do workpackage */}
      <div className="bg-azul/5 border border-azul/10 shadow-sm rounded-xl p-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-azul" />
            </div>
            <div>
              <p className="text-sm text-azul/70">Progresso global</p>
              <p className="text-2xl font-semibold text-azul">{porcentagemConcluido}%</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-azul/70">Tarefas</p>
              <p className="text-lg font-medium text-azul">{tarefasConcluidas} de {totalTarefas}</p>
            </div>
            <div>
              <p className="text-sm text-azul/70">Duração</p>
              <p className="text-lg font-medium text-azul">{calcularDuracaoDias()} dias</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Nome do workpackage (forma editável) */}
      {editingName ? (
        <div className="bg-white border border-azul/10 shadow-sm rounded-xl p-5 animate-in fade-in-50 slide-in-from-top-5 duration-200">
          <h3 className="text-lg font-medium text-azul mb-3">Editar Nome</h3>
          <div className="flex gap-2 items-center">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border-azul/20 focus:border-azul focus:ring-1 focus:ring-azul/30 py-2 rounded-lg"
              placeholder="Nome do workpackage"
              autoFocus
            />
            <Button
              onClick={handleNameSave}
              className="bg-azul hover:bg-azul/90 text-white h-10"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Guardar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNewName(workpackage.nome || "");
                setEditingName(false);
              }}
              className="h-10 border-gray-200"
            >
              <XIcon className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-azul/70">Nome atual</p>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">{workpackage.nome}</h3>
          </div>
        </div>
      )}
      
      {/* Período do workpackage */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-azul" />
          <h3 className="text-lg font-medium text-azul">Período</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-azul/70">Data de início</Label>
            <DatePicker
              value={workpackage.inicio ? new Date(workpackage.inicio) : undefined}
              onChange={(date) => handleDateChange('inicio', date)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-azul/70">Data de conclusão</Label>
            <DatePicker
              value={workpackage.fim ? new Date(workpackage.fim) : undefined}
              onChange={(date) => handleDateChange('fim', date)}
              className="w-full"
            />
          </div>
        </div>
      </div>
      
      {/* Descrição do workpackage */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-azul" />
            <h3 className="text-lg font-medium text-azul">Descrição</h3>
          </div>
          {!editingDescription && (
            <Button
              variant="outline"
              onClick={() => {
                setNewDescription(workpackage.descricao || "");
                setEditingDescription(true);
              }}
              size="sm"
              className="h-9 border-azul/20 text-azul hover:bg-azul/10"
            >
              <PencilIcon className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          )}
        </div>
        
        {editingDescription ? (
          <div className="space-y-3">
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="min-h-[200px] border-azul/20 focus:border-azul focus:ring-1 focus:ring-azul/30 rounded-lg resize-none"
              placeholder="Adicione uma descrição detalhada sobre este workpackage..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingDescription(false)}
                className="h-9 rounded-lg border-gray-200"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDescriptionSave}
                className="h-9 bg-azul text-white hover:bg-azul/90 rounded-lg"
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[150px]">
            {workpackage.descricao?.trim() ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {workpackage.descricao}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <FileIcon className="h-6 w-6 text-gray-400 mb-2" />
                <p className="text-gray-500 mb-3">Nenhuma descrição adicionada</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewDescription("");
                    setEditingDescription(true);
                  }}
                  className="border-azul/20 text-azul hover:bg-azul/5"
                >
                  Adicionar descrição
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 