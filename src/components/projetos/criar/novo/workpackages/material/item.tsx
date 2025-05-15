import { useState } from "react";
import {
  Edit,
  Trash2,
  Coins,
  Hash,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Rubrica } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Form } from "./form";
import { cn } from "@/lib/utils";

interface Material {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  mes: number;
  rubrica: Rubrica;
  workpackageId?: string;
  estado?: boolean;
}

interface MaterialItemProps {
  material: Material;
  onCreate: (workpackageId: string, material: Omit<Material, "id" | "estado">) => Promise<void>;
  onEdit: (workpackageId: string, material: Material) => Promise<void>;
  onRemove: (materialId: number) => Promise<void>;
  onToggleEstado: (materialId: number) => void;
  readOnly?: boolean;
}

// Mapeamento de rubricas para variantes de badge
const rubricaParaVariante: Record<
  Rubrica,
  "blue" | "purple" | "indigo" | "orange" | "red" | "default"
> = {
  MATERIAIS: "blue",
  SERVICOS_TERCEIROS: "purple",
  OUTROS_SERVICOS: "indigo",
  DESLOCACAO_ESTADAS: "orange",
  OUTROS_CUSTOS: "red",
  CUSTOS_ESTRUTURA: "default", // emerald (verde) já é o default
  INSTRUMENTOS_E_EQUIPAMENTOS: "default",
  SUBCONTRATOS: "default",
};

// Função para obter o nome da rubrica
function obterNomeRubrica(rubrica: Rubrica): string {
  const rubricas: Record<Rubrica, string> = {
    MATERIAIS: "Materiais",
    SERVICOS_TERCEIROS: "Serviços Terceiros",
    OUTROS_SERVICOS: "Outros Serviços",
    DESLOCACAO_ESTADAS: "Deslocação e Estadas",
    OUTROS_CUSTOS: "Outros Custos",
    CUSTOS_ESTRUTURA: "Custos de Estrutura",
    INSTRUMENTOS_E_EQUIPAMENTOS: "Instrumentos e Equipamentos",
    SUBCONTRATOS: "Subcontratos",
  };

  return rubricas[rubrica] || rubrica;
}

// Função para obter o nome do mês
function obterNomeMes(mes: number): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  return meses[mes - 1] || String(mes);
}

export function MaterialItem({ material, onCreate, onEdit, onRemove, onToggleEstado, readOnly = false }: MaterialItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const valorTotal = material.preco * material.quantidade;
  
  // Handler para quando o formulário é submetido
  const handleSubmit = async (workpackageId: string, updatedMaterial: any) => {
    try {
      if (updatedMaterial.id) {
        await onEdit(workpackageId, {
          ...updatedMaterial,
          id: material.id,
          estado: material.estado,
        });
      } else {
        await onCreate(workpackageId, updatedMaterial);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar material:", error);
    }
  };

  // Handler para cancelar a edição
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Handler para alternar expansão
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Handler para remoção
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onRemove(material.id);
    } catch (error) {
      console.error("Erro ao remover material:", error);
    }
  };

  // Handler para alternar estado do material
  const handleToggleEstado = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleEstado(material.id);
  };

  // Se estiver em modo de edição, mostrar o formulário
  if (isEditing) {
    return (
      <Card className="border-azul/10 p-4">
        <h5 className="mb-3 text-sm font-medium text-azul">Editar Material</h5>
        <Form
          workpackageId={material.workpackageId || ""}
          initialValues={{
            nome: material.nome,
            descricao: material.descricao || "",
            preco: material.preco,
            quantidade: material.quantidade,
            ano_utilizacao: material.ano_utilizacao,
            mes: material.mes || 1,
            rubrica: material.rubrica,
            id: material.id,
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </Card>
    );
  }

  // Caso contrário, mostrar a visualização normal
  return (
    <Card className="overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      <div className="cursor-pointer p-3 hover:bg-gray-50" onClick={toggleExpand}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={handleToggleEstado}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                material.estado
                  ? "border-emerald-500/10 bg-emerald-500 text-white"
                  : "border-zinc-300 bg-white hover:bg-zinc-100"
              )}
            >
              {material.estado && <Check className="h-3.5 w-3.5" />}
            </button>
            <div>
              <h5 className="text-sm font-medium text-azul">{material.nome}</h5>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant={rubricaParaVariante[material.rubrica]}
                  className="px-1.5 py-0.5 text-[10px]"
                >
                  {obterNomeRubrica(material.rubrica)}
                </Badge>

                {material.estado !== undefined && (
                  <Badge
                    variant={material.estado ? "default" : "outline"}
                    className={cn(
                      "h-4 px-1 py-0 text-[10px]",
                      material.estado
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-blue-200 bg-blue-50 text-azul"
                    )}
                  >
                    {material.estado ? "Concluído" : "Em Progresso"}
                  </Badge>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{obterNomeMes(material.mes || 1)} {material.ano_utilizacao}</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <Coins className="h-3 w-3" />
                  <span>{formatCurrency(valorTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!readOnly && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="h-7 w-7 rounded-lg p-0 text-azul hover:bg-azul/10"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="h-7 w-7 rounded-lg p-0 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="h-7 w-7 rounded-lg p-0 hover:bg-azul/10"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-azul/70" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-azul/70" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-azul/10 bg-azul/5 p-3">
          <div className="space-y-3">
            {material.descricao && (
              <div className="space-y-1">
                <h6 className="text-xs font-medium text-azul/80">Descrição</h6>
                <p className="rounded-md border border-azul/10 bg-white/80 p-2 text-sm text-gray-600">
                  {material.descricao || "Sem descrição"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-md border border-azul/10 bg-white/80 p-2">
                <h6 className="mb-1 text-xs font-medium text-azul/80">Quantidade</h6>
                <div className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-azul" />
                  <span className="text-sm font-medium">{material.quantidade} unidades</span>
                </div>
              </div>

              <div className="rounded-md border border-azul/10 bg-white/80 p-2">
                <h6 className="mb-1 text-xs font-medium text-azul/80">Preço unitário</h6>
                <div className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-azul" />
                  <span className="text-sm font-medium">{formatCurrency(material.preco)}</span>
                </div>
              </div>

              <div className="rounded-md border border-azul/10 bg-white/80 p-2">
                <h6 className="mb-1 text-xs font-medium text-azul/80">Total</h6>
                <div className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(valorTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-azul/10 bg-white/80 p-2">
              <h6 className="mb-1 text-xs font-medium text-azul/80">Detalhes</h6>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-azul" />
                  <span className="text-sm">
                    Data: {obterNomeMes(material.mes || 1)} / {material.ano_utilizacao}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-azul" />
                  <span className="text-sm">
                    Rubrica: {obterNomeRubrica(material.rubrica)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
