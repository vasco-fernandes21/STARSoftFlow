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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { Loader2, Save, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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
  horasPotenciais: number;
  jornadaDiaria?: number;
}

// Interface para o payload de atualização do utilizador
interface ConfiguracaoUtilizadorInput {
  userId: string;
  mes: number;
  ano: number;
  diasUteis: number;
  horasPotenciais: number;
  jornadaDiaria?: number;
}

// Interface para os valores de input
interface ConfigInput {
  diasUteis: string;
  horasPotenciais: string;
  jornadaDiaria: string;
}

interface ValidationErrors {
  diasUteis?: string;
  horasPotenciais?: string;
  jornadaDiaria?: string;
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
  const createGlobalConfigMutation = api.configuracao.create.useMutation();
  const updateGlobalConfigMutation = api.configuracao.update.useMutation();
  
  // Fetch user's monthly configurations if userId is provided
  const { data: userConfigs } = api.configuracao.getConfigMensalUtilizador.useQuery(
    { userId: userId || "" },
    { enabled: open && !isGlobalConfig }
  );

  // Fetch global configurations
  const { 
    data: globalConfigs,
    refetch: refetchGlobalConfigs 
  } = api.configuracao.getByAno.useQuery(
    selectedYear,
    { enabled: open && isGlobalConfig }
  );

  // Estado para armazenar os valores dos inputs
  const [configValues, setConfigValues] = useState<Record<number, ConfigInput>>({});

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
          horasPotenciais: configData.horasPotenciais.toString(),
          jornadaDiaria: configData.jornadaDiaria?.toString() || "" // Valor vazio em vez de valor padrão
        };
      } else if (isGlobalConfig) {
        newConfigValues[configData.mes] = {
          diasUteis: configData.diasUteis.toString(),
          horasPotenciais: configData.horasPotenciais.toString(),
          jornadaDiaria: configData.jornadaDiaria?.toString() || "" // Valor vazio em vez de valor padrão
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

  // guardar todas as configurações do ano selecionado
  const addConfigMutation = api.configuracao.addConfigMensalUtilizador.useMutation();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      for (const month of months) {
        const monthConfig = configValues[month.value];
        if (!monthConfig) continue;

        // Validar e converter valores
        const diasUteis = monthConfig.diasUteis.trim() === "" ? null : parseInt(monthConfig.diasUteis);
        const horasPotenciais = monthConfig.horasPotenciais.trim() === "" ? null : parseFloat(monthConfig.horasPotenciais);
        const jornadaDiaria = monthConfig.jornadaDiaria?.trim() === "" ? null : parseInt(monthConfig.jornadaDiaria);

        // Se todos os valores forem null, pular este mês
        if (diasUteis === null && horasPotenciais === null && jornadaDiaria === null) continue;

        // Validar se os valores fornecidos são números válidos (não checamos jornadaDiaria se for null)
        if ((diasUteis !== null && isNaN(diasUteis)) || 
            (horasPotenciais !== null && isNaN(horasPotenciais)) || 
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
            await updateGlobalConfigMutation.mutateAsync({
              id: existingConfig.id,
              data: {
                ...(diasUteis !== null && { diasUteis }),
                ...(horasPotenciais !== null && { horasPotenciais }),
                ...(jornadaDiaria !== null && { jornadaDiaria })
              }
            });
          } else if (diasUteis !== null && horasPotenciais !== null) {
            // Criar nova configuração global apenas se ambos os valores estiverem preenchidos
            const payload: ConfiguracaoCriarInput = {
              mes: month.value,
              ano: selectedYear,
              diasUteis,
              horasPotenciais
            };
            
            // Adicionar jornadaDiaria apenas se não for null
            if (jornadaDiaria !== null) {
              payload.jornadaDiaria = jornadaDiaria;
            }
            
            await createGlobalConfigMutation.mutateAsync(payload);
          }
        } else {
          // Salvar configuração específica do utilizador
          const payload: ConfiguracaoUtilizadorInput = {
            userId: userId!,
            mes: month.value,
            ano: selectedYear,
            diasUteis: diasUteis || 0,
            horasPotenciais: horasPotenciais || 0
          };
          
          // Adicionar jornadaDiaria apenas se não for null
          if (jornadaDiaria !== null) {
            payload.jornadaDiaria = jornadaDiaria;
          }
          
          await addConfigMutation.mutateAsync(payload);
        }
      }
      
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

    if (isGlobalConfig) {
      return Boolean(configs.find(config => config.mes === month));
    }
    return Boolean(configs.find(config => config.ano === selectedYear && config.mes === month));
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
        jornadaDiaria: "" // Valor vazio em vez de valor padrão
      }
    }));
    
    // Limpar erros do mês
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[month];
      return newErrors;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-azul" />
            <span>
              {isGlobalConfig ? "Configuração Global" : "Configuração Específica"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isGlobalConfig 
              ? "Visualize as configurações globais de dias úteis e horas potenciais."
              : "Configure os dias úteis e horas potenciais específicos para este utilizador."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end my-4">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent>
              {[new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="0" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            {quarters.map((quarter, index) => (
              <TabsTrigger key={index} value={index.toString()} className="text-sm">
                {quarter.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {quarters.map((quarter, index) => (
            <TabsContent key={index} value={index.toString()} className="mt-4">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base text-slate-600">
                    {quarter.label} - {selectedYear}
                    {isGlobalConfig && (
                      <span className="ml-2 text-sm text-slate-400">
                        (Configuração Global)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-3 gap-4 mt-4">
                    {quarter.months.map((month) => {
                      const configValue = configValues[month.value];
                      const existingConfig = hasExistingConfig(month.value);
                      
                      return (
                        <Card key={month.value} className={cn(
                          "relative",
                          existingConfig ? "border-blue-200 bg-blue-50/30" : "",
                          isGlobalConfig ? "opacity-90" : ""
                        )}>
                          <CardHeader className="py-2 px-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium">{month.label}</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleClearMonth(month.value)}
                                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                              >
                                Limpar
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 pt-0">
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor={`diasUteis-${month.value}`}>Dias Úteis</Label>
                                <div className="space-y-1">
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
                                      "w-full",
                                      isGlobalConfig ? "bg-white" : "",
                                      errors[month.value]?.diasUteis ? "border-red-500 focus:ring-red-500" : ""
                                    )}
                                  />
                                  {errors[month.value]?.diasUteis && (
                                    <p className="text-xs text-red-500">{errors[month.value]?.diasUteis}</p>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`horasPotenciais-${month.value}`}>Horas Potenciais</Label>
                                <div className="space-y-1">
                                  <Input
                                    id={`horasPotenciais-${month.value}`}
                                    type="number"
                                    min="0"
                                    max="744"
                                    value={configValue?.horasPotenciais ?? ""}
                                    onChange={(e) => handleInputChange(month.value, "horasPotenciais", e.target.value)}
                                    onBlur={(e) => handleBlur(month.value, "horasPotenciais", e.target.value)}
                                    disabled={isLoading}
                                    className={cn(
                                      "w-full",
                                      isGlobalConfig ? "bg-white" : "",
                                      errors[month.value]?.horasPotenciais ? "border-red-500 focus:ring-red-500" : ""
                                    )}
                                  />
                                  {errors[month.value]?.horasPotenciais && (
                                    <p className="text-xs text-red-500">{errors[month.value]?.horasPotenciais}</p>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`jornadaDiaria-${month.value}`}>Jornada Diária (h)</Label>
                                <div className="space-y-1">
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
                                      "w-full",
                                      isGlobalConfig ? "bg-white" : "",
                                      errors[month.value]?.jornadaDiaria ? "border-red-500 focus:ring-red-500" : ""
                                    )}
                                  />
                                  {errors[month.value]?.jornadaDiaria && (
                                    <p className="text-xs text-red-500">{errors[month.value]?.jornadaDiaria}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || Object.keys(errors).length > 0}
            className="bg-azul hover:bg-azul/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configurações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 