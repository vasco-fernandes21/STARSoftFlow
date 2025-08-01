import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Package, ChevronDown, ChevronRight } from "lucide-react";
import type { WorkpackageCompleto } from "@/components/projetos/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Rubrica } from "@prisma/client";
import { motion } from "framer-motion";
import { MaterialItem } from "@/components/projetos/criar/novo/workpackages/material/item";
import { formatCurrency } from "@/lib/utils";
import type Decimal from "decimal.js";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Form as MaterialForm } from "@/components/projetos/criar/novo/workpackages/material/form";

interface WorkpackageMateriaisProps {
  workpackage: WorkpackageCompleto;
  _workpackageId: string;
  projetoId: string;
  canEdit?: boolean;
}

// Interface que corresponde ao schema do tRPC e ao componente MaterialItem
interface MaterialData {
  id?: number;
  nome: string;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
  mes?: number;
  descricao?: string | null | undefined;
  estado?: boolean;
  workpackageId?: string;
}

// Mapeamento de rubricas para variantes de badge
const rubricaColors: Record<Rubrica, string> = {
  MATERIAIS: 'blue',
  SERVICOS_TERCEIROS: 'purple',
  OUTROS_SERVICOS: 'indigo',
  DESLOCACAO_ESTADAS: 'orange',
  OUTROS_CUSTOS: 'red',
  CUSTOS_ESTRUTURA: 'default',
  INSTRUMENTOS_E_EQUIPAMENTOS: 'green',
  SUBCONTRATOS: 'yellow'
};

export function WorkpackageMateriais({
  workpackage,
  _workpackageId,
  projetoId,
  canEdit = true,
}: WorkpackageMateriaisProps) {
  const [showForm, setShowForm] = useState(false);
  const [expandedRubricas, setExpandedRubricas] = useState<Record<string, boolean>>({});

  const utils = api.useUtils();

  // tRPC mutations
  const createMaterial = api.material.create.useMutation({
    onSuccess: () => {
      utils.projeto.core.findById.invalidate(projetoId);
      toast.success("Material criado", {
        description: "O material foi criado com sucesso."
      });
      setShowForm(false);
    },
    onError: () => {
      toast.error("Erro ao criar", {
        description: "Não foi possível criar o material. Tente novamente."
      });
    },
  });

  const updateMaterial = api.material.update.useMutation({
    onSuccess: () => {
      utils.projeto.core.findById.invalidate(projetoId);
      toast.success("Material atualizado", {
        description: "O material foi atualizado com sucesso."
      });
    },
    onError: () => {
      toast.error("Erro ao atualizar", {
        description: "Não foi possível atualizar o material. Tente novamente."
      });
    },
  });

  const deleteMaterial = api.material.delete.useMutation({
    onSuccess: () => {
      utils.projeto.core.findById.invalidate(projetoId);
      toast.success("Material removido", {
        description: "O material foi removido com sucesso."
      });
    },
    onError: () => {
      toast.error("Erro ao remover", {
        description: "Não foi possível remover o material. Tente novamente."
      });
    },
  });

  const toggleEstadoMaterial = api.material.atualizarEstado.useMutation({
    onSuccess: () => {
      utils.projeto.core.findById.invalidate(projetoId);
    },
    onError: () => {
      toast.error("Erro ao atualizar estado", {
        description: "Não foi possível atualizar o estado do material. Tente novamente."
      });
    },
  });

  // Handlers for MaterialItem callbacks
  const handleCreate = async (workpackageId: string, material: Omit<MaterialData, "id" | "estado">) => {
    await createMaterial.mutateAsync({
      ...material,
      workpackageId,
      descricao: material.descricao || undefined
    });
  };

  const handleEdit = async (workpackageId: string, material: MaterialData) => {
    if (!material.id) return;
    
    await updateMaterial.mutateAsync({
      id: material.id,
      data: {
        nome: material.nome,
        descricao: material.descricao || undefined,
        preco: material.preco,
        quantidade: material.quantidade,
        ano_utilizacao: material.ano_utilizacao,
        mes: material.mes || 1,
        rubrica: material.rubrica,
      }
    });
  };

  const handleRemove = async (materialId: number) => {
    await deleteMaterial.mutateAsync(materialId);
  };

  const handleToggleEstado = async (materialId: number) => {
    await toggleEstadoMaterial.mutateAsync(materialId);
  };

  // Calcular o valor total (preço x quantidade) com segurança
  const calcularTotal = (preco: Decimal | number, quantidade: number): number => {
    const precoNum = typeof preco === "number" ? preco : Number(preco.toString());
    return precoNum * quantidade;
  };

  // Calcular o total geral - usa o workpackage props
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

    workpackage.materiais.forEach((material) => {
      const rubrica = material.rubrica;
      if (!grupos[rubrica]) {
        grupos[rubrica] = [];
      }
      grupos[rubrica].push(material);
    });

    return Object.entries(grupos).map(([rubrica, materiais]) => ({
      rubrica,
      materiais,
      total: materiais.reduce((total, m) => total + calcularTotal(m.preco, m.quantidade), 0),
    }));
  };

  const toggleRubrica = (rubrica: string) => {
    setExpandedRubricas((prev) => ({
      ...prev,
      [rubrica]: !prev[rubrica],
    }));
  };

  const formatarRubrica = (rubrica: string) => {
    switch (rubrica) {
      case "MATERIAIS":
        return "Materiais";
      case "SERVICOS_TERCEIROS":
        return "Serviços de Terceiros";
      case "OUTROS_SERVICOS":
        return "Outros Serviços";
      case "DESLOCACAO_ESTADAS":
        return "Deslocações e Estadas";
      case "OUTROS_CUSTOS":
        return "Outros Custos";
      case "CUSTOS_ESTRUTURA":
        return "Custos de Estrutura";
      default:
        return rubrica;
    }
  };

  // Agrupar os materiais por rubrica
  const materiaisPorRubrica = agruparPorRubrica();
  const totalGeral = calcularTotalGeral();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Materiais</h2>
          <p className="text-sm text-gray-500">Gerir materiais do workpackage</p>
        </div>

        {!showForm && canEdit && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-10 bg-azul text-white hover:bg-azul/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Material
          </Button>
        )}
      </div>

      {/* Formulário para adicionar/editar material */}
      {showForm && canEdit && (
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
                fim: workpackage.fim,
              }}
              onSubmit={(_, material) =>
                handleCreate(workpackage.id, material)
              }
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        </Card>
      )}

      {/* Informações sobre o total */}
      <div className="flex w-full flex-col rounded-lg border border-azul/10 bg-azul/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-3 flex items-center sm:mb-0">
          <Package className="mr-2 h-5 w-5 text-azul" />
          <h3 className="text-sm font-medium text-azul">
            {workpackage.materiais ? workpackage.materiais.length : 0}{" "}
            {workpackage.materiais?.length === 1 ? "material" : "materiais"} adicionados
          </h3>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-medium">Total:</span>{" "}
          <span className="font-bold text-azul/90">{formatCurrency(totalGeral)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {materiaisPorRubrica.length === 0 ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50 py-8 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <h3 className="mb-1 font-medium text-gray-500">Nenhum material adicionado</h3>
            <p className="mb-4 text-sm text-gray-400">Adicione materiais a este workpackage</p>
            {canEdit && (
              <Button
                className="bg-azul text-white hover:bg-azul/90"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Material
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {materiaisPorRubrica.map((grupo) => (
              <div
                key={`${grupo.rubrica}-${workpackage.id}`}
                className="overflow-hidden rounded-lg border border-gray-100 shadow-sm"
              >
                <div
                  className="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50"
                  onClick={() => toggleRubrica(grupo.rubrica)}
                >
                  <div className="flex items-center">
                    <Badge
                      className={cn(
                        "mr-3",
                        rubricaColors[grupo.rubrica as Rubrica] === "blue" &&
                          "bg-blue-100 text-blue-800 hover:bg-blue-200",
                        rubricaColors[grupo.rubrica as Rubrica] === "purple" &&
                          "bg-purple-100 text-purple-800 hover:bg-purple-200",
                        rubricaColors[grupo.rubrica as Rubrica] === "indigo" &&
                          "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
                        rubricaColors[grupo.rubrica as Rubrica] === "orange" &&
                          "bg-orange-100 text-orange-800 hover:bg-orange-200",
                        rubricaColors[grupo.rubrica as Rubrica] === "red" &&
                          "bg-red-100 text-red-800 hover:bg-red-200",
                        rubricaColors[grupo.rubrica as Rubrica] === "default" &&
                          "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      )}
                    >
                      {formatarRubrica(grupo.rubrica)}
                    </Badge>
                    <span className="text-sm font-medium text-gray-700">
                      {grupo.materiais.length} {grupo.materiais.length === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(grupo.total)}
                    </span>
                    {expandedRubricas[grupo.rubrica] ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>

                {expandedRubricas[grupo.rubrica] && (
                  <div className="divide-y divide-gray-100">
                    {grupo.materiais.map((material) => (
                      <div key={material.id} className="bg-white px-2 py-2">
                        <MaterialItem
                          material={material}
                          onCreate={handleCreate}
                          onEdit={handleEdit}
                          onRemove={handleRemove}
                          onToggleEstado={handleToggleEstado}
                          readOnly={!canEdit}
                        />
                      </div>
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
