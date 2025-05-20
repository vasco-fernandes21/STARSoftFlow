"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { Loader2, Save, Calendar, Clock, Briefcase, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface para a resposta da API de configuração
interface ConfiguracaoApi {
  id: string;
  mes: number;
  ano: number;
  diasUteis: number;
  horasPotenciais: any; // Para suportar Decimal
  jornadaDiaria?: number; // Campo opcional
  createdAt: Date;
  updatedAt: Date;
}

// Interface para o payload de criação
interface ConfiguracaoCriarInput {
  mes: number;
  ano: number;
  diasUteis: number;
  jornadaDiaria?: number;
}

// Interface para os valores de input
interface ConfigInput {
  diasUteis: string;
  jornadaDiaria: string;
  horasPotenciais?: string;
}

interface ValidationErrors {
  diasUteis?: string;
  horasPotenciais?: string;
  jornadaDiaria?: string;
}

// Interface para o payload de atualização do utilizador
interface ConfiguracaoUtilizadorInput {
  userId: string;
  mes: number;
  ano: number;
  diasUteis: number;
  jornadaDiaria?: number;
}

interface ConfiguracaoUtilizadorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  userId?: string;
}

// Define meses fora do componente para evitar recriações
const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

// Função para organizar os meses em trimestres
const getQuarters = () => {
  return [
    { label: "1º Trimestre", months: months.slice(0, 3) },
    { label: "2º Trimestre", months: months.slice(3, 6) },
    { label: "3º Trimestre", months: months.slice(6, 9) },
    { label: "4º Trimestre", months: months.slice(9, 12) },
  ];
};

export function ConfiguracaoMensalUtilizador({ open, onOpenChange, onSave, userId }: ConfiguracaoUtilizadorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const isGlobalConfig = !userId;
  const [errors, setErrors] = useState<Record<number, ValidationErrors>>({});
  
  // Mutations para configurações globais
  const createGlobalConfigMutation = api.utilizador.configuracoes.create.useMutation();
  const updateGlobalConfigMutation = api.utilizador.configuracoes.update.useMutation();
  
  // Fetch user's monthly configurations if userId is provided
  const { data: userConfigs } = api.utilizador.configuracoes.findUtilizador.useQuery(
    { userId: userId || "" },
    { enabled: open && !isGlobalConfig }
  );

  // Fetch global configurations
  const { 
    data: globalConfigs,
    refetch: refetchGlobalConfigs 
  } = api.utilizador.configuracoes.getByAno.useQuery(
    selectedYear,
    { enabled: open && isGlobalConfig }
  );

  // Estado para armazenar os valores dos inputs
  const [configValues, setConfigValues] = useState<Record<number, ConfigInput>>({});

  // API utils para invalidar queries
  const utils = api.useUtils();

  // Atualizar valores quando as configurações forem carregadas
  useEffect(() => {
    const configs = isGlobalConfig ? globalConfigs : userConfigs;
    if (!configs) return;

    const newConfigValues: Record<number, ConfigInput> = {};
    
    configs.forEach(config => {
      // Tratar como ConfiguracaoApi para lidar com o campo jornadaDiaria opcional
      const configData = config as unknown as ConfiguracaoApi;
      
      if (!isGlobalConfig && configData.ano === selectedYear) {
        newConfigValues[configData.mes] = {
          diasUteis: configData.diasUteis.toString(),
          jornadaDiaria: configData.jornadaDiaria?.toString() || ""
        };
      } else if (isGlobalConfig) {
        newConfigValues[configData.mes] = {
          diasUteis: configData.diasUteis.toString(),
          jornadaDiaria: configData.jornadaDiaria?.toString() || ""
        };
      }
    });

    setConfigValues(newConfigValues);
  }, [userConfigs, globalConfigs, selectedYear, isGlobalConfig]);

  // Validação dos campos
  const validateField = (month: number, field: 'diasUteis' | 'horasPotenciais' | 'jornadaDiaria', value: string) => {
    const newErrors = { ...errors };
    if (!newErrors[month]) {
      newErrors[month] = {};
    }

    if (field === 'diasUteis') {
      const dias = parseInt(value);
      if (isNaN(dias)) {
        newErrors[month].diasUteis = "Os dias úteis devem ser um número válido";
      } else if (dias < 0) {
        newErrors[month].diasUteis = "Os dias úteis não podem ser negativos";
      } else if (dias > 31) {
        newErrors[month].diasUteis = "Os dias úteis não podem ser maiores que 31";
      } else {
        delete newErrors[month].diasUteis;
      }
    }

    if (field === 'horasPotenciais') {
      const horas = parseFloat(value.replace(',', '.'));
      if (isNaN(horas)) {
        newErrors[month].horasPotenciais = "As horas potenciais devem ser um número válido";
      } else if (horas < 0) {
        newErrors[month].horasPotenciais = "As horas potenciais não podem ser negativas";
      } else if (horas > 1000) {
        newErrors[month].horasPotenciais = "As horas potenciais não podem ser maiores que 1000";
      } else {
        delete newErrors[month].horasPotenciais;
      }
    }

    if (field === 'jornadaDiaria') {
      const jornada = parseInt(value);
      if (isNaN(jornada)) {
        newErrors[month].jornadaDiaria = "A jornada diária deve ser um número válido";
      } else if (jornada < 0) {
        newErrors[month].jornadaDiaria = "A jornada diária não pode ser negativa";
      } else if (jornada > 24) {
        newErrors[month].jornadaDiaria = "A jornada diária não pode ser maior que 24 horas";
      } else {
        delete newErrors[month].jornadaDiaria;
      }
    }

    if (Object.keys(newErrors[month]).length === 0) {
      delete newErrors[month];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Atualizar valor de input
  const handleInputChange = (month: number, field: 'diasUteis' | 'horasPotenciais' | 'jornadaDiaria', value: string) => {
    setConfigValues(prev => {
      const currentConfig = prev[month] ?? { diasUteis: "", horasPotenciais: "", jornadaDiaria: "" };
      return {
        ...prev,
        [month]: {
          ...currentConfig,
          [field]: value
        }
      };
    });
  };

  // Handler para quando o campo perde o foco
  const handleBlur = (month: number, field: 'diasUteis' | 'horasPotenciais' | 'jornadaDiaria', value: string) => {
    validateField(month, field, value);
  };

  // Mutation para configurações do utilizador
  const addConfigMutation = api.utilizador.configuracoes.createUtilizador.useMutation({
    onSuccess: () => {
      if (!isGlobalConfig) {
        utils.utilizador.configuracoes.findUtilizador.invalidate({ userId: userId || "" });
      }
    }
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const configPromises = [];

      for (const month of months) {
        const monthConfig = configValues[month.value];
        if (!monthConfig) continue;

        // Validar e converter valores
        const diasUteis = monthConfig.diasUteis.trim() === "" ? null : parseInt(monthConfig.diasUteis);
        const jornadaDiaria = monthConfig.jornadaDiaria?.trim() === "" ? null : parseInt(monthConfig.jornadaDiaria);

        // Se todos os valores forem null, pular este mês
        if (diasUteis === null && jornadaDiaria === null) continue;

        // Validar se os valores fornecidos são números válidos
        if ((diasUteis !== null && isNaN(diasUteis)) || 
            (jornadaDiaria !== null && isNaN(jornadaDiaria))) {
          toast.error(`Valores inválidos para ${months.find(m => m.value === month.value)?.label}`);
          continue;
        }

        if (isGlobalConfig) {
          // Procurar configuração existente para este mês/ano
          const existingConfig = globalConfigs?.find(
            config => config.mes === month.value && config.ano === selectedYear
          );

          if (existingConfig) {
            // Atualizar configuração existente
            configPromises.push(
              updateGlobalConfigMutation.mutateAsync({
                id: existingConfig.id,
                data: {
                  ...(diasUteis !== null && { diasUteis }),
                  ...(jornadaDiaria !== null && { jornadaDiaria })
                }
              })
            );
          } else if (diasUteis !== null) {
            // Criar nova configuração global apenas se diasUteis estiver preenchido
            const payload: ConfiguracaoCriarInput = {
              mes: month.value,
              ano: selectedYear,
              diasUteis
            };
            // Adicionar jornadaDiaria apenas se não for null
            if (jornadaDiaria !== null) {
              payload.jornadaDiaria = jornadaDiaria;
            }
            configPromises.push(createGlobalConfigMutation.mutateAsync(payload));
          }
        } else {
          // Salvar configuração específica do utilizador
          const payload: ConfiguracaoUtilizadorInput = {
            userId: userId!,
            mes: month.value,
            ano: selectedYear,
            diasUteis: diasUteis || 0,
          };
          if (jornadaDiaria !== null) {
            payload.jornadaDiaria = jornadaDiaria;
          }
          configPromises.push(addConfigMutation.mutateAsync(payload));
        }
      }

      await Promise.all(configPromises);
      
      if (isGlobalConfig) {
        await refetchGlobalConfigs();
      }
      
      toast.success(
        isGlobalConfig 
          ? "Configurações globais guardadas com sucesso!"
          : "Configurações do utilizador guardadas com sucesso!"
      );
      onSave?.();
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error(
        isGlobalConfig
          ? "Erro ao salvar configurações globais"
          : "Erro ao salvar configurações do utilizador"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se um mês já possui configuração salva
  const hasExistingConfig = (month: number): boolean => {
    const configs = isGlobalConfig ? globalConfigs : userConfigs;
    if (!configs) return false;

    // Encontrar configuração existente para o mês
    const config = isGlobalConfig 
      ? configs.find(config => config.mes === month)
      : configs.find(config => config.ano === selectedYear && config.mes === month);
    
    if (!config) return false;
    
    // Verificar se tem valores significativos (diferente de 0)
    const configData = config as unknown as ConfiguracaoApi;
    const hasDiasUteis = configData.diasUteis > 0;
    const hasJornadaDiaria = typeof configData.jornadaDiaria === 'number' && configData.jornadaDiaria > 0;
    
    // Só considerar configurado se pelo menos um valor for significativo
    return hasDiasUteis || hasJornadaDiaria;
  };
  
  // Obter trimestres organizados
  const quarters = getQuarters();

  // Função para limpar configuração de um mês
  const handleClearMonth = (month: number) => {
    setConfigValues(prev => ({
      ...prev,
      [month]: {
        diasUteis: "0",
        horasPotenciais: "0",
        jornadaDiaria: "0"
      }
    }));
    
    // Limpar erros do mês
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[month];
      return newErrors;
    });
    
    // Se houver uma configuração existente, atualizar para zeros
    const updateConfig = async () => {
      try {
        if (isGlobalConfig) {
          const existingConfig = globalConfigs?.find(
            config => config.mes === month && config.ano === selectedYear
          );
          
          if (existingConfig) {
            await updateGlobalConfigMutation.mutateAsync({
              id: existingConfig.id,
              data: { diasUteis: 0, jornadaDiaria: 0 }
            });
            await refetchGlobalConfigs();
          }
        } else if (userId) {
          const payload: ConfiguracaoUtilizadorInput = {
            userId: userId,
            mes: month,
            ano: selectedYear,
            diasUteis: 0,
            jornadaDiaria: 0
          };
          await addConfigMutation.mutateAsync(payload);
        }
      } catch (error) {
        console.error("Erro ao limpar configuração:", error);
      }
    };
    
    // Executar a atualização
    updateConfig();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-none bg-white/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-[950px] max-h-[85vh]">
        <form className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader className="border-b border-white/20 bg-gradient-to-b from-azul/10 to-transparent p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-azul/20 bg-azul/10">
                <Calendar className="h-6 w-6 text-azul" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {isGlobalConfig ? "Configuração Global" : "Configuração Mensal"}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {isGlobalConfig 
                    ? "Defina os dias úteis e jornada diária para todos os utilizadores"
                    : "Configure os dias úteis e jornada diária para este utilizador"
                  }
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[140px] rounded-xl bg-white/70 border-gray-200 shadow-sm hover:border-azul/30 transition-all focus:ring-2 focus:ring-azul/20">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map((year) => (
                    <SelectItem key={year} value={year.toString()} className="cursor-pointer">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto p-6">
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="w-full grid grid-cols-4 rounded-2xl bg-white/30 border border-gray-100 p-0 shadow-sm mb-6 overflow-hidden">
                {quarters.map((quarter, index) => (
                  <TabsTrigger 
                    key={index} 
                    value={index.toString()} 
                    className="rounded-none py-3 text-sm font-medium text-gray-600 transition-all duration-200 border-r border-gray-100 last:border-r-0
                              data-[state=active]:bg-white data-[state=active]:text-azul data-[state=active]:shadow"
                  >
                    {quarter.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {quarters.map((quarter, index) => (
                <TabsContent key={index} value={index.toString()} className="mt-1 focus-visible:outline-none focus-visible:ring-0">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {quarter.months.map((month) => {
                        const configValue = configValues[month.value];
                        const existingConfig = hasExistingConfig(month.value);
                        
                        return (
                          <div key={month.value} 
                            className={cn(
                              "group relative rounded-xl bg-white p-5 transition-all duration-300",
                              existingConfig 
                                ? "shadow-md ring-1 ring-azul/20" 
                                : "shadow-sm hover:shadow-md ring-1 ring-gray-100 hover:ring-azul/10",
                            )}
                          >
                            {/* Cabeçalho do mês */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <div className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full mr-3",
                                  existingConfig
                                    ? "bg-azul text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600"
                                )}>
                                  <span className="text-sm font-bold">
                                    {month.value}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-800">
                                    {month.label}
                                  </h3>
                                  {existingConfig && (
                                    <Badge variant="outline" className="mt-1 bg-azul/5 text-azul border-azul/20 text-xs">
                                      Configurado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleClearMonth(month.value)}
                                      className="h-8 w-8 p-0 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                      <span className="sr-only">Limpar valores</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Limpar valores</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            {/* Formulário */}
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label 
                                    htmlFor={`diasUteis-${month.value}`}
                                    className="text-xs font-medium text-gray-700"
                                  >
                                    Dias Úteis
                                  </Label>
                                  {errors[month.value]?.diasUteis && (
                                    <p className="text-xs text-red-500">{errors[month.value]?.diasUteis}</p>
                                  )}
                                </div>
                                <div className="relative">
                                  <Input
                                    id={`diasUteis-${month.value}`}
                                    type="number"
                                    min="0"
                                    max="31"
                                    value={configValue?.diasUteis ?? ""}
                                    onChange={(e) => handleInputChange(month.value, "diasUteis", e.target.value)}
                                    onBlur={(e) => handleBlur(month.value, "diasUteis", e.target.value)}
                                    disabled={isLoading}
                                    className={cn(
                                      "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20",
                                      errors[month.value]?.diasUteis && "border-red-300 focus:ring-red-500/20"
                                    )}
                                  />
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label 
                                    htmlFor={`jornadaDiaria-${month.value}`}
                                    className="text-xs font-medium text-gray-700"
                                  >
                                    Jornada Diária (h)
                                  </Label>
                                  {errors[month.value]?.jornadaDiaria && (
                                    <p className="text-xs text-red-500">{errors[month.value]?.jornadaDiaria}</p>
                                  )}
                                </div>
                                <div className="relative">
                                  <Input
                                    id={`jornadaDiaria-${month.value}`}
                                    type="number"
                                    min="0"
                                    max="24"
                                    value={configValue?.jornadaDiaria ?? ""}
                                    onChange={(e) => handleInputChange(month.value, "jornadaDiaria", e.target.value)}
                                    onBlur={(e) => handleBlur(month.value, "jornadaDiaria", e.target.value)}
                                    disabled={isLoading}
                                    placeholder=""
                                    className={cn(
                                      "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20",
                                      errors[month.value]?.jornadaDiaria && "border-red-300 focus:ring-red-500/20"
                                    )}
                                  />
                                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                              </div>
                              
                              <div>
                                <Label 
                                  htmlFor={`horasPotenciais-${month.value}`}
                                  className="text-xs font-medium text-gray-700 block mb-1.5"
                                >
                                  Horas Potenciais
                                </Label>
                                <div className="relative">
                                  <div 
                                    className={cn(
                                      "rounded-xl bg-white/70 h-10 flex items-center pl-9 pr-3 border border-gray-200 shadow-sm",
                                      configValue?.diasUteis && configValue?.jornadaDiaria && Number(configValue.diasUteis) > 0 && Number(configValue.jornadaDiaria) > 0
                                        ? "text-azul font-medium"
                                        : "text-gray-400"
                                    )}
                                  >
                                    {configValue?.diasUteis && configValue?.jornadaDiaria && Number(configValue.diasUteis) > 0 && Number(configValue.jornadaDiaria) > 0
                                      ? `${Number(configValue.diasUteis) * Number(configValue.jornadaDiaria)} horas`
                                      : "Automático"
                                    }
                                  </div>
                                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            
            {/* Informação sobre o preenchimento */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-700">Informação</h4>
                <p className="text-xs text-blue-600 mt-1">
                  Configure os dias úteis e jornada diária para cada mês. As horas potenciais serão calculadas 
                  automaticamente multiplicando os dias úteis pela jornada diária. 
                  {isGlobalConfig 
                    ? " A configuração global será aplicada a todos os utilizadores do regime integral."
                    : " A configuração específica terá prioridade sobre a configuração global."}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:bg-white/80 hover:text-gray-900 hover:shadow-md"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </DialogClose>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || Object.keys(errors).length > 0}
              className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Configurações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}