import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { useWorkpackageMutations } from "@/hooks/useWorkpackageMutations";
import { MaterialForm } from "@/components/projetos/criar/novo/workpackages/material/form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Trash, PackageOpen, DollarSign } from "lucide-react";

// Função para formatar valores monetários
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-PT', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(value);
};

interface WorkpackageMateriaisProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
}

export function WorkpackageMateriais({ 
  workpackage,
  workpackageId
}: WorkpackageMateriaisProps) {
  // Estado para controlar adição de material
  const [addingMaterial, setAddingMaterial] = useState(false);
  
  // Hooks para mutações
  const { 
    createMaterialMutation,
    deleteMaterialMutation
  } = useWorkpackageMutations();
  
  // Handler para adicionar material
  const handleAddMaterial = (workpackageId: string, material: any) => {
    createMaterialMutation.mutate({
      workpackageId: workpackageId,
      nome: material.nome,
      preco: material.preco,
      quantidade: material.quantidade,
      rubrica: material.rubrica,
      ano_utilizacao: material.ano_utilizacao
    });
    
    setAddingMaterial(false);
  };
  
  // Handler para remover material
  const handleRemoveMaterial = (materialId: number) => {
    if (confirm("Tem certeza que deseja remover este material?")) {
      deleteMaterialMutation.mutate(materialId);
    }
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
  
  // Calcular o valor total (preço x quantidade) com segurança
  const calcularTotal = (preco: any, quantidade: number): number => {
    const precoNum = typeof preco === 'number' ? preco : 
      typeof preco === 'string' ? parseFloat(preco) : 0;
    return precoNum * quantidade;
  };

  // Calcular o total geral
  const calcularTotalGeral = (): number => {
    if (!workpackage.materiais || workpackage.materiais.length === 0) return 0;
    return workpackage.materiais.reduce((total, material) => {
      return total + calcularTotal(material.preco, material.quantidade);
    }, 0);
  };
  
  // Agrupar materiais por rubrica para visualização
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
      total: materiais.reduce((sum, m) => sum + calcularTotal(m.preco, m.quantidade), 0)
    }));
  };
  
  const gruposMateriais = agruparPorRubrica();
  const totalMateriais = workpackage.materiais?.length || 0;
  
  // Contar recursos por mês/ano
  const agruparRecursosPorPeriodo = () => {
    if (!workpackage.recursos || workpackage.recursos.length === 0) return [];
    
    const periodos: Record<string, { 
      mes: number, 
      ano: number, 
      alocacoes: typeof workpackage.recursos,
      totalOcupacao: number
    }> = {};
    
    workpackage.recursos.forEach(recurso => {
      const key = `${recurso.mes}-${recurso.ano}`;
      if (!periodos[key]) {
        periodos[key] = { 
          mes: recurso.mes, 
          ano: recurso.ano, 
          alocacoes: [],
          totalOcupacao: 0
        };
      }
      periodos[key].alocacoes.push(recurso);
      periodos[key].totalOcupacao += Number(recurso.ocupacao);
    });
    
    return Object.values(periodos).sort((a, b) => {
      return a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes;
    });
  };
  
  const recursosPorPeriodo = agruparRecursosPorPeriodo();
  const totalRecursos = workpackage.recursos?.length || 0;
  const pessoasAlocadas = workpackage.recursos && workpackage.recursos.length > 0 
    ? new Set(workpackage.recursos.map(r => r.userId)).size 
    : 0;
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-azul">Materiais e Serviços</h2>
          <p className="text-sm text-azul/60 mt-1">Gerir materiais, serviços e custos do workpackage</p>
        </div>
        
        {!addingMaterial && (
          <Button
            variant="outline"
            onClick={() => setAddingMaterial(true)}
            className="h-10 border-azul/20 text-azul hover:bg-azul/10"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Material/Serviço
          </Button>
        )}
      </div>
      
      {/* Resumo de custos */}
      {workpackage.materiais && workpackage.materiais.length > 0 && (
        <Card className="p-5 border border-azul/10 bg-azul/5 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-azul" />
              </div>
              <div>
                <p className="text-sm text-azul/70">Custo total</p>
                <p className="text-2xl font-semibold text-azul">{formatCurrency(calcularTotalGeral())}</p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-azul/70">Materiais</p>
                <p className="text-lg font-medium text-azul">{totalMateriais}</p>
              </div>
              <div>
                <p className="text-sm text-azul/70">Categorias</p>
                <p className="text-lg font-medium text-azul">{gruposMateriais.length}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Formulário para adicionar novo material */}
      {addingMaterial && (
        <Card className="p-6 border border-azul/10 bg-white shadow-sm animate-in fade-in-50 slide-in-from-top-5 duration-200">
          <h3 className="text-lg font-medium text-azul mb-5">Novo Material/Serviço</h3>
          <MaterialForm
            workpackageId={workpackage.id}
            onSubmit={handleAddMaterial}
            onCancel={() => setAddingMaterial(false)}
          />
        </Card>
      )}
      
      {/* Lista de materiais agrupada por rubrica */}
      {workpackage.materiais && workpackage.materiais.length > 0 ? (
        <div className="space-y-6">
          {gruposMateriais.map(grupo => (
            <div key={grupo.rubrica} className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium text-azul flex items-center gap-2">
                  <Badge variant="outline" className="text-sm py-0.5 px-2.5 bg-azul/5 border-azul/20">
                    {formatarRubrica(grupo.rubrica)}
                  </Badge>
                  <span className="text-azul/60">{grupo.materiais.length} {grupo.materiais.length > 1 ? 'itens' : 'item'}</span>
                </h3>
                <span className="text-sm font-medium text-azul">{formatCurrency(grupo.total)}</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {grupo.materiais.map((material) => (
                  <Card key={material.id} className="p-4 border-azul/10 bg-white shadow-sm hover:border-azul/20 transition-all">
                    <div className="flex justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-azul/10 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-azul" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-azul">{material.nome}</h4>
                          <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                            <span className="text-xs text-azul/70">
                              {material.quantidade} {material.quantidade > 1 ? "unidades" : "unidade"} x {formatCurrency(Number(material.preco))}
                            </span>
                            <Badge 
                              variant="outline" 
                              className="bg-gray-50 text-gray-600 border-gray-200 text-xs"
                            >
                              {material.ano_utilizacao}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-azul mr-3">
                          {formatCurrency(calcularTotal(material.preco, material.quantidade))}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMaterial(material.id)}
                          className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-azul/10 shadow-sm">
          <PackageOpen className="h-12 w-12 text-azul/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-azul mb-2">Nenhum material adicionado</h3>
          <p className="text-sm text-azul/60 max-w-md mx-auto">Clique em "Novo Material/Serviço" para adicionar materiais, serviços ou outros custos a este workpackage</p>
        </div>
      )}
    </div>
  );
}
