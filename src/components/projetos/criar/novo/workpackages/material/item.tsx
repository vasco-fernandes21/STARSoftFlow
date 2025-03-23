import { useState } from "react";
import { Package, Edit, Trash2, Coins, Hash, ShoppingCart, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rubrica } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Form } from "./form";
import { useQueryClient } from "@tanstack/react-query";

interface Material {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
  workpackageId?: string;
}

interface MaterialItemProps {
  material: Material;
  onEdit: (workpackageId: string, material: {
    id: number;
    nome: string;
    descricao?: string;
    preco: number;
    quantidade: number;
    ano_utilizacao: number;
    rubrica: Rubrica;
  }) => void;
  onRemove: () => void;
  onUpdate?: () => void;
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

// Função para obter o nome da rubrica
function obterNomeRubrica(rubrica: Rubrica): string {
  const rubricas: Record<Rubrica, string> = {
    MATERIAIS: "Materiais",
    SERVICOS_TERCEIROS: "Serviços de Terceiros",
    OUTROS_SERVICOS: "Outros Serviços",
    DESLOCACAO_ESTADIAS: "Deslocação e Estadias",
    OUTROS_CUSTOS: "Outros Custos",
    CUSTOS_ESTRUTURA: "Custos de Estrutura"
  };
  
  return rubricas[rubrica] || rubrica;
}

export function Item({
  material,
  onEdit,
  onRemove,
  onUpdate
}: MaterialItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localMaterial, setLocalMaterial] = useState(material);
  const valorTotal = localMaterial.preco * localMaterial.quantidade;
  const queryClient = useQueryClient();
  
  // Handler para quando o formulário é submetido
  const handleSubmit = (workpackageId: string, updatedMaterial: any) => {
    // Atualizar o estado local imediatamente para feedback instantâneo na UI
    setLocalMaterial({
      ...localMaterial,
      ...updatedMaterial,
      id: material.id
    });
    
    // Atualizar os dados na cache para outros componentes refletirem esta mudança
    if (workpackageId) {
      // Atualizar o material na lista de materiais do workpackage
      queryClient.setQueryData(
        ["workpackage.getById", { id: workpackageId }],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          // Criar uma cópia profunda para evitar mutações
          const newData = JSON.parse(JSON.stringify(oldData));
          
          // Atualizar o material na lista
          if (newData.materiais) {
            const materialIndex = newData.materiais.findIndex(
              (m: any) => m.id === material.id
            );
            
            if (materialIndex !== -1) {
              newData.materiais[materialIndex] = {
                ...newData.materiais[materialIndex],
                ...updatedMaterial,
                id: material.id
              };
            }
          }
          
          return newData;
        }
      );
    }
    
    // Chamar a função de edição original (que faz a mutation para o servidor)
    onEdit(workpackageId, {
      ...updatedMaterial,
      id: material.id
    });
    
    setIsEditing(false);
    
    // Chamar onUpdate se existir
    if (onUpdate) {
      onUpdate();
    }
  };
  
  // Handler para cancelar a edição
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  // Handler para remoção com atualização
  const handleRemove = () => {
    onRemove();
    
    // Chamar onUpdate se existir
    if (onUpdate) {
      onUpdate();
    }
  };
  
  // Se estiver em modo de edição, mostrar o formulário
  if (isEditing) {
    return (
      <Card className="border-azul/10 p-4">
        <h5 className="text-sm font-medium text-azul mb-3">Editar Material</h5>
        <Form
          workpackageId={localMaterial.workpackageId || ""}
          initialValues={{
            nome: localMaterial.nome,
            descricao: localMaterial.descricao || "",
            preco: localMaterial.preco,
            quantidade: localMaterial.quantidade,
            ano_utilizacao: localMaterial.ano_utilizacao,
            rubrica: localMaterial.rubrica
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onUpdate={onUpdate}
        />
      </Card>
    );
  }
  
  // Caso contrário, mostrar a visualização normal
  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center mt-0.5">
              <Package className="h-3.5 w-3.5 text-azul" />
            </div>
            <div>
              <h5 className="text-sm font-medium text-azul">{localMaterial.nome}</h5>
              
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge 
                  variant={rubricaParaVariante[localMaterial.rubrica]}
                  className="px-1.5 py-0.5 text-[10px]"
                >
                  {obterNomeRubrica(localMaterial.rubrica)}
                </Badge>
                
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{localMaterial.ano_utilizacao}</span>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Hash className="h-3 w-3" />
                  <span>{localMaterial.quantidade} un.</span>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Coins className="h-3 w-3" />
                  <span>{formatCurrency(valorTotal)}</span>
                </div>
              </div>
              
              {localMaterial.descricao && (
                <p className="mt-2 text-sm text-gray-600">
                  {localMaterial.descricao}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10 text-azul"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
