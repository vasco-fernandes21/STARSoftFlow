import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, ChevronDown, ChevronRight } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { useMutations } from "@/hooks/useMutations";
import { Form as MaterialForm } from "@/components/projetos/criar/novo/workpackages/material/form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rubrica } from "@prisma/client";
import { motion } from "framer-motion";
import { Item as MaterialItem } from "@/components/projetos/criar/novo/workpackages/material/item";
import { formatCurrency } from "@/lib/utils";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";

interface WorkpackageMateriaisProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  projetoId?: string;
}

// Interface base para material
interface MaterialBase {
  id?: number;
  nome: string;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
}

// Interface para o formulário (usando null para campos opcionais)
interface MaterialFormValues extends MaterialBase {
  descricao: string | null;
}

// Mapeamento de rubricas para variantes de badge
const rubricaParaVariante: Record<Rubrica, "blue" | "purple" | "indigo" | "orange" | "red" | "default"> = {
  MATERIAIS: "blue",
  SERVICOS_TERCEIROS: "purple",
  OUTROS_SERVICOS: "indigo",
  DESLOCACAO_ESTADIAS: "orange",
  OUTROS_CUSTOS: "red",
  CUSTOS_ESTRUTURA: "default"
};

export function WorkpackageMateriais({ 
  workpackage,
  workpackageId,
  projetoId
}: WorkpackageMateriaisProps) {
  const [showForm, setShowForm] = useState(false);
  const [expandedRubricas, setExpandedRubricas] = useState<Record<string, boolean>>({});
  
  const { material: materialMutations } = useMutations(projetoId);
  
  // Calcular o valor total (preço x quantidade) com segurança
  const calcularTotal = (preco: Decimal | number, quantidade: number): number => {
    const precoNum = typeof preco === 'number' ? preco : Number(preco.toString());
    return precoNum * quantidade;
  };

  // Calcular o total geral - usa o workpackage props
  const calcularTotalGeral = (): number => {
    if (!workpackage.materiais || workpackage.materiais.length === 0) return 0;
    return workpackage.materiais.reduce((total, material) => {
      return total + calcularTotal(material.preco, material.quantidade);
    }, 0);
  };
  
  // Agrupar materiais por rubrica para visualização - usa o workpackage props
  const agruparPorRubrica = () => {
    if (!workpackage.materiais || workpackage.materiais.length === 0) return [];
    
    const grupos: Record<string, any[]> = {};
    
    workpackage.materiais.forEach(material => {
      const rubrica = material.rubrica;
      if (!grupos[rubrica]) {
        grupos[rubrica] = [];
      }
      grupos[rubrica].push(material);
    });
    
    return Object.entries(grupos).map(([rubrica, materiais]) => ({
      rubrica,
      materiais,
      total: materiais.reduce((total, m) => total + calcularTotal(m.preco, m.quantidade), 0)
    }));
  };
  
  const toggleRubrica = (rubrica: string) => {
    setExpandedRubricas(prev => ({
      ...prev,
      [rubrica]: !prev[rubrica]
    }));
  };

  const formatarRubrica = (rubrica: string) => {
    switch (rubrica) {
      case "MATERIAIS": return "Materiais";
      case "SERVICOS_TERCEIROS": return "Serviços de Terceiros";
      case "OUTROS_SERVICOS": return "Outros Serviços";
      case "DESLOCACAO_ESTADIAS": return "Deslocações e Estadias";
      case "OUTROS_CUSTOS": return "Outros Custos";
      case "CUSTOS_ESTRUTURA": return "Custos de Estrutura";
      default: return rubrica;
    }
  };
  
  // Agrupar os materiais por rubrica
  const materiaisPorRubrica = agruparPorRubrica();
  const totalGeral = calcularTotalGeral();
  
  // Wrapper para o MaterialForm.onSubmit
  const handleFormSubmit = (formValues: MaterialFormValues) => {
    materialMutations.handleSubmit(workpackage.id, formValues, materialMutations);
    setShowForm(false);
  };

  // Wrapper para o MaterialItem.onEdit
  const handleItemEdit = (formValues: MaterialFormValues) => {
    materialMutations.handleSubmit(workpackage.id, formValues, materialMutations);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Materiais</h2>
          <p className="text-sm text-gray-500">Gerir materiais do workpackage</p>
        </div>
        
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-10 bg-azul hover:bg-azul/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Material
          </Button>
        )}
      </div>
      
      {/* Formulário para adicionar/editar material */}
      {showForm && (
        <Card>
          <motion.div 
            className="p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <MaterialForm
              workpackageId={workpackage.id}
              workpackageDates={{
                inicio: workpackage.inicio,
                fim: workpackage.fim
              }}
              onSubmit={(_, material) => handleFormSubmit({
                ...material,
                descricao: material.descricao || null
              })}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        </Card>
      )}
      
      {/* Informações sobre o total */}
      <div className="w-full py-4 px-5 bg-azul/5 border border-azul/10 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center mb-3 sm:mb-0">
          <Package className="h-5 w-5 text-azul mr-2" />
          <h3 className="text-sm font-medium text-azul">
            {workpackage.materiais ? workpackage.materiais.length : 0} {workpackage.materiais?.length === 1 ? 'material' : 'materiais'} adicionados
          </h3>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-medium">Total:</span>{' '}
          <span className="font-bold text-azul/90">{formatCurrency(totalGeral)}</span>
        </div>
      </div>
      
      <div className="space-y-4 mt-6">
        {materiaisPorRubrica.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-gray-500 font-medium mb-1">Nenhum material adicionado</h3>
            <p className="text-gray-400 text-sm mb-4">Adicione materiais a este workpackage</p>
            <Button
              className="bg-azul hover:bg-azul/90 text-white"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Material
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {materiaisPorRubrica.map(grupo => (
              <div key={`${grupo.rubrica}-${workpackage.id}`} className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRubrica(grupo.rubrica)}
                >
                  <div className="flex items-center">
                    <Badge className={cn(
                      "mr-3",
                      rubricaParaVariante[grupo.rubrica as Rubrica] === "blue" && "bg-blue-100 text-blue-800 hover:bg-blue-200",
                      rubricaParaVariante[grupo.rubrica as Rubrica] === "purple" && "bg-purple-100 text-purple-800 hover:bg-purple-200",
                      rubricaParaVariante[grupo.rubrica as Rubrica] === "indigo" && "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
                      rubricaParaVariante[grupo.rubrica as Rubrica] === "orange" && "bg-orange-100 text-orange-800 hover:bg-orange-200",
                      rubricaParaVariante[grupo.rubrica as Rubrica] === "red" && "bg-red-100 text-red-800 hover:bg-red-200",
                      rubricaParaVariante[grupo.rubrica as Rubrica] === "default" && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                    )}>
                      {formatarRubrica(grupo.rubrica)}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {grupo.materiais.length} {grupo.materiais.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(grupo.total)}
                    </span>
                    {expandedRubricas[grupo.rubrica] ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {expandedRubricas[grupo.rubrica] && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {grupo.materiais.map((material: any) => {
                      // Garantir que descricao é sempre string | null
                      const descricao = material.descricao === undefined ? null : material.descricao;
                      
                      return (
                        <MaterialItem
                          key={`${material.id}-${workpackage.id}`}
                          material={{
                            id: material.id,
                            nome: material.nome,
                            descricao,
                            preco: Number(material.preco),
                            quantidade: material.quantidade,
                            ano_utilizacao: material.ano_utilizacao,
                            rubrica: material.rubrica,
                            workpackageId: workpackage.id,
                            estado: material.estado
                          }}
                          onEdit={(_, material) => handleItemEdit({
                            ...material,
                            descricao: material.descricao || null
                          })}
                          onRemove={() => materialMutations.handleRemove(material.id, materialMutations)}
                          onToggleEstado={(id, estado) => materialMutations.handleToggleEstado(id, estado, workpackage.id, materialMutations)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
