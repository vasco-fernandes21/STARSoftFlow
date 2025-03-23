import { useState, useRef, useEffect } from "react";
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
import { TextField, TextareaField, DateField } from "@/components/projetos/criar/components/FormFields";

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
  const [nome, setNome] = useState(workpackage.nome || "");
  const [descricao, setDescricao] = useState(workpackage.descricao || "");
  const [dataInicio, setDataInicio] = useState<Date | null>(workpackage.inicio ? new Date(workpackage.inicio) : null);
  const [dataFim, setDataFim] = useState<Date | null>(workpackage.fim ? new Date(workpackage.fim) : null);
  
  // estado para erros de validação
  const [erros, setErros] = useState<{
    nome?: string;
    descricao?: string;
    dataInicio?: string;
    dataFim?: string;
  }>({});
  
  // referências para timeout
  const descricaoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // setup do TanStack Query
  const queryClient = useQueryClient();
  
  // Limpar timeouts na desmontagem do componente
  useEffect(() => {
    return () => {
      if (descricaoTimeoutRef.current) clearTimeout(descricaoTimeoutRef.current);
    };
  }, []);
  
  // Mutações internas ou recebidas por props
  const localUpdateMutation = api.workpackage.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage"] });
      queryClient.invalidateQueries({ queryKey: ["projeto"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: (error: any) => {
      // Tentar extrair erros específicos de campos da mensagem de erro
      try {
        const errorData = JSON.parse(error.message);
        if (Array.isArray(errorData)) {
          errorData.forEach(err => {
            if (err.path[0] === "nome") {
              setErros(prev => ({ ...prev, nome: err.message }));
            }
          });
        } else {
          toast.error("Erro ao atualizar workpackage");
        }
      } catch {
        toast.error("Erro ao atualizar workpackage");
      }
    }
  });
  
  // Usar mutação do pai ou a local
  const updateMutation = mutations?.updateWorkpackage || localUpdateMutation;
  
  // validação local
  const validarNome = (valor: string) => {
    if (!valor.trim()) {
      return "O nome é obrigatório";
    }
    if (valor.trim().length < 3) {
      return "Nome deve ter pelo menos 3 caracteres";
    }
    return undefined;
  };
  
  // handlers para atualização de campos
  const handleNameChange = (novoNome: string) => {
    setNome(novoNome);
    
    // Limpar erro quando o utilizador está a editar
    if (erros.nome) {
      setErros(prev => ({ ...prev, nome: undefined }));
    }
  };
  
  // Só atualizar quando o campo perder o foco
  const handleNameBlur = () => {
    const erro = validarNome(nome);
    setErros(prev => ({ ...prev, nome: erro }));
    
    if (!erro) {
      updateMutation.mutate({
        id: workpackageId,
        nome: nome
      });
    }
  };
  
  const handleDescriptionChange = (novaDescricao: string) => {
    setDescricao(novaDescricao);
    
    // Limpar o timeout anterior se existir
    if (descricaoTimeoutRef.current) {
      clearTimeout(descricaoTimeoutRef.current);
    }
    
    // Definir um novo timeout para atualizar apenas quando o utilizador parar de escrever
    descricaoTimeoutRef.current = setTimeout(() => {
      updateMutation.mutate({
        id: workpackageId,
        descricao: novaDescricao
      });
    }, 1000); // 1 segundo de delay
  };
  
  const handleStartDateChange = (novaData: Date | null) => {
    setDataInicio(novaData);
    updateMutation.mutate({
      id: workpackageId,
      inicio: novaData
    });
  };
  
  const handleEndDateChange = (novaData: Date | null) => {
    setDataFim(novaData);
    updateMutation.mutate({
      id: workpackageId,
      fim: novaData
    });
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Informações</h2>
        <p className="text-sm text-gray-500">Detalhes do workpackage</p>
      </div>

      {/* Nome */}
      <TextField
        label="Nome"
        value={nome}
        onChange={handleNameChange}
        placeholder="Nome do workpackage"
        required
        helpText={erros.nome || ""}
        className={erros.nome ? "error" : ""}
        onBlur={handleNameBlur}
      />

      {/* Datas */}
      <div className="grid grid-cols-2 gap-4">
        <DateField
          label="Data de início"
          value={dataInicio}
          onChange={handleStartDateChange}
          helpText={erros.dataInicio || ""}
          required
        />
        
        <DateField
          label="Data de conclusão"
          value={dataFim}
          onChange={handleEndDateChange}
          helpText={erros.dataFim || ""}
          required
        />
      </div>

      {/* Descrição */}
      <TextareaField
        label="Descrição"
        value={descricao}
        onChange={handleDescriptionChange}
        placeholder="Descreva este pacote de trabalho"
        rows={4}
        helpText={erros.descricao || ""}
      />
    </div>
  );
} 