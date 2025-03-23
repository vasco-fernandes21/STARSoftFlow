import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { useWorkpackageMutations } from "@/hooks/useWorkpackageMutations";
import { Form as MaterialForm } from "@/components/projetos/criar/novo/workpackages/material/form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { Rubrica, Material } from "@prisma/client";
import { motion } from "framer-motion";
import { Item as MaterialItem } from "@/components/projetos/criar/novo/workpackages/material/item";
import { formatCurrency } from "@/lib/utils";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";

interface WorkpackageMateriaisProps {
  workpackage: WorkpackageCompleto;
}

// Mapeamento de rubricas para variantes de badge
const rubricaParaVariante: Record<Rubrica, "blue" | "purple" | "indigo" | "orange" | "red" | "default"> = {
  MATERIAIS: "blue",
  SERVICOS_TERCEIROS: "purple",
  OUTROS_SERVICOS: "indigo",
  DESLOCACAO_ESTADIAS: "orange",
  OUTROS_CUSTOS: "red",
  CUSTOS_ESTRUTURA: "default" // emerald (verde) já é o default
};

export function WorkpackageMateriais({ workpackage }: WorkpackageMateriaisProps) {
  const [showForm, setShowForm] = useState(false);
  const [expandedRubricas, setExpandedRubricas] = useState<Record<string, boolean>>({});
  const [localWorkpackage, setLocalWorkpackage] = useState<WorkpackageCompleto>(workpackage);
  // Adicionamos um contador para forçar re-renderização
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // atualizar o localWorkpackage quando o workpackage props mudar
  useEffect(() => {
    setLocalWorkpackage(workpackage);
  }, [workpackage]);
  
  const queryClient = useQueryClient();
  
  // Função para invalidar as queries relevantes
  const invalidateQueries = useCallback(() => {
    // invalida as queries
    queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackage.id }] });
    queryClient.invalidateQueries({ queryKey: ["projeto.getById"] });
    
    // atualiza os dados locais a partir da cache
    const updatedData = queryClient.getQueryData(["workpackage.getById", { id: workpackage.id }]);
    if (updatedData) {
      // força a atualização do state local usando os dados da cache
      setLocalWorkpackage(updatedData as WorkpackageCompleto);
    }
    
    // Incrementar o contador para forçar re-renderização
    setRefreshCounter(prev => prev + 1);
    
    console.log("invalidateQueries chamado, forçando re-renderização");
  }, [queryClient, workpackage.id]);
  
  // Usar o hook de mutações do workpackage
  const { 
    createMaterialMutation, 
    updateMaterialMutation, 
    deleteMaterialMutation 
  } = useWorkpackageMutations();
  
  // Handler para adicionar/atualizar material
  const handleSubmitMaterial = useCallback((workpackageId: string, material: {
    id?: number;
    nome: string;
    descricao?: string;
    preco: number;
    quantidade: number;
    ano_utilizacao: number;
    rubrica: Material['rubrica'];
  }) => {
    if (material.id) {
      // Atualizar material existente no estado local
      setLocalWorkpackage((prev) => {
        // Criar cópia profunda para evitar problemas de referência
        const novosLocais = JSON.parse(JSON.stringify(prev));
        // Encontrar e atualizar o material
        const materialIndex = novosLocais.materiais.findIndex((m: any) => m.id === material.id);
        if (materialIndex !== -1) {
          novosLocais.materiais[materialIndex] = {
            ...novosLocais.materiais[materialIndex],
            nome: material.nome,
            descricao: material.descricao || null, // Importante: null em vez de undefined
            preco: material.preco,
            quantidade: material.quantidade,
            ano_utilizacao: material.ano_utilizacao,
            rubrica: material.rubrica
          };
        }
        return novosLocais;
      });
      
      // Forçar re-renderização
      setRefreshCounter(prev => prev + 1);
      
      // Fazer a mutação no servidor
      updateMaterialMutation.mutate({
        id: material.id,
        workpackageId,
        nome: material.nome,
        descricao: material.descricao,
        preco: material.preco,
        quantidade: material.quantidade,
        ano_utilizacao: material.ano_utilizacao,
        rubrica: material.rubrica
      }, {
        onSuccess: () => {
          invalidateQueries();
        }
      });
      setShowForm(false);
    } else {
      // Criar um ID temporário para o material novo
      const tempId = Date.now();
      
      // Adicionar ao estado local
      setLocalWorkpackage((prev) => {
        // Criar cópia profunda
        const novosLocais = JSON.parse(JSON.stringify(prev));
        // Adicionar novo material com campos garantidos
        novosLocais.materiais.push({
          id: tempId,
          nome: material.nome,
          descricao: material.descricao || null, // Importante: null em vez de undefined
          preco: material.preco,
          quantidade: material.quantidade,
          ano_utilizacao: material.ano_utilizacao,
          rubrica: material.rubrica,
          workpackageId: workpackageId
        });
        return novosLocais;
      });
      
      // Forçar re-renderização
      setRefreshCounter(prev => prev + 1);
      
      // Adicionar ao servidor
      createMaterialMutation.mutate({
        workpackageId,
        nome: material.nome,
        descricao: material.descricao,
        preco: material.preco,
        quantidade: material.quantidade,
        ano_utilizacao: material.ano_utilizacao,
        rubrica: material.rubrica
      }, {
        onSuccess: () => {
          invalidateQueries();
        }
      });
      setShowForm(false);
    }
  }, [createMaterialMutation, updateMaterialMutation, invalidateQueries]);
  
  // Handler para remover material
  const handleRemoveMaterial = useCallback((materialId: number) => {
    if (confirm("Tem certeza que deseja remover este material?")) {
      // Remover do estado local
      setLocalWorkpackage((prev) => {
        // Criar cópia profunda
        const novosLocais = JSON.parse(JSON.stringify(prev));
        // Filtrar o material
        novosLocais.materiais = novosLocais.materiais.filter((m: any) => m.id !== materialId);
        return novosLocais;
      });
      
      // Forçar re-renderização
      setRefreshCounter(prev => prev + 1);
      
      // Remover do servidor
      deleteMaterialMutation.mutate(materialId, {
        onSuccess: () => {
          invalidateQueries();
        }
      });
    }
  }, [deleteMaterialMutation, invalidateQueries]);
  
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
  
  // Calcular o valor total (preço x quantidade) com segurança
  const calcularTotal = (preco: Decimal | number, quantidade: number): number => {
    const precoNum = typeof preco === 'number' ? preco : Number(preco.toString());
    return precoNum * quantidade;
  };

  // Calcular o total geral - usa o localWorkpackage aqui em vez do workpackage props
  const calcularTotalGeral = (): number => {
    if (!localWorkpackage.materiais || localWorkpackage.materiais.length === 0) return 0;
    return localWorkpackage.materiais.reduce((total, material) => {
      return total + calcularTotal(material.preco, material.quantidade);
    }, 0);
  };
  
  // Agrupar materiais por rubrica para visualização - usa o localWorkpackage
  const agruparPorRubrica = () => {
    if (!localWorkpackage.materiais || localWorkpackage.materiais.length === 0) return [];
    
    console.log("Recalculando grupos, refreshCounter:", refreshCounter);
    
    const grupos: Record<string, any[]> = {};
    
    localWorkpackage.materiais.forEach(material => {
      const rubrica = material.rubrica;
      if (!grupos[rubrica]) {
        grupos[rubrica] = [];
      }
      grupos[rubrica].push(material);
    });
    
    return Object.entries(grupos).map(([rubrica, materiais]) => ({
      rubrica,
      materiais,
      total: materiais.reduce((sum, m) => sum + calcularTotal(m.preco, m.quantidade), 0)
    }));
  };
  
  // Calculamos a cada renderização, o refreshCounter força isto
  const gruposMateriais = agruparPorRubrica();
  const totalGeral = calcularTotalGeral();
  
  // Alternar expansão de uma rubrica
  const toggleRubrica = (rubrica: string) => {
    setExpandedRubricas(prev => ({
      ...prev,
      [rubrica]: !prev[rubrica]
    }));
  };
  
  useEffect(() => {
    console.log("Componente re-renderizado, refreshCounter:", refreshCounter);
  }, [refreshCounter]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Materiais e Custos</h2>
          <p className="text-sm text-gray-500">
            Gerencie os materiais e custos associados a este workpackage
          </p>
        </div>
        
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-azul hover:bg-azul/90 text-white"
        >
          {showForm ? (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Material
            </>
          )}
        </Button>
      </div>
      
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          key={`form-${refreshCounter}`} // Forçar recriação do componente
        >
          <MaterialForm
            workpackageId={workpackage.id}
            onSubmit={handleSubmitMaterial}
            onCancel={() => setShowForm(false)}
            onUpdate={invalidateQueries}
          />
        </motion.div>
      )}
      
      <Card className="p-4 bg-gray-50 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-azul" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700">Custo Total</h4>
              <p className="text-lg font-semibold text-azul">{formatCurrency(totalGeral)}</p>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="space-y-4 mt-6">
        {gruposMateriais.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">Sem materiais</h3>
            <p className="text-sm text-gray-500 mb-4">
              Adicione materiais a este workpackage para visualizá-los aqui.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-azul hover:bg-azul/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Material
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {gruposMateriais.map(grupo => (
              <div key={`${grupo.rubrica}-${refreshCounter}`} className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRubrica(grupo.rubrica)}
                >
                  <div className="flex items-center gap-2">
                    {expandedRubricas[grupo.rubrica] ? 
                      <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    }
                    <Badge 
                      variant={rubricaParaVariante[grupo.rubrica as Rubrica]}
                      className="rounded-md"
                    >
                      {formatarRubrica(grupo.rubrica)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      ({grupo.materiais.length} {grupo.materiais.length === 1 ? 'item' : 'itens'})
                    </span>
                  </div>
                  <div className="font-medium text-azul">
                    {formatCurrency(grupo.total)}
                  </div>
                </div>
                
                {expandedRubricas[grupo.rubrica] && (
                  <div className="p-3 space-y-3 bg-white border-t border-gray-100">
                    {grupo.materiais.map((material: any) => (
                      <MaterialItem
                        key={`${material.id}-${refreshCounter}`}
                        material={{
                          id: material.id,
                          nome: material.nome,
                          descricao: material.descricao,
                          preco: Number(material.preco),
                          quantidade: material.quantidade,
                          ano_utilizacao: material.ano_utilizacao,
                          rubrica: material.rubrica,
                          workpackageId: workpackage.id
                        }}
                        onEdit={handleSubmitMaterial}
                        onRemove={() => handleRemoveMaterial(material.id)}
                        onUpdate={invalidateQueries}
                      />
                    ))}
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
