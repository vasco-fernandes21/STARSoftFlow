import { useState } from "react";
import { Decimal } from "decimal.js";
import { Item } from "./item";
import { Form } from "./form";

interface DetailsProps {
  userId: string;
  recurso: {
    userId: string;
    alocacoes: Array<{
      mes: number;
      ano: number;
      ocupacao: any;
    }>;
  };
  membroEquipa: {
    id: string;
    name?: string | null;
    email?: string | null;
    regime?: string;
    [key: string]: any;
  } | undefined;
  isExpanded: boolean;
  workpackageId: string;
  onToggleExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
  formatarDataSegura: (ano: string | number, mes: string | number, formatString: string) => string;
  alocacoesPorAnoMes: Record<string, Record<number, number>>;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  onSaveEdit?: (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
  }>) => void;
  utilizadores?: Array<{ id: string; name: string; email: string; regime: string }>;
  inicio?: Date;
  fim?: Date;
}

export function Details({
  userId,
  recurso,
  membroEquipa,
  isExpanded,
  workpackageId,
  onToggleExpand,
  onEdit,
  onRemove,
  formatarDataSegura,
  alocacoesPorAnoMes,
  isEditing = false,
  onCancelEdit = () => {},
  onSaveEdit = () => {},
  utilizadores = [],
  inicio = new Date(),
  fim = new Date()
}: DetailsProps) {
  const [editingMode, setEditingMode] = useState(isEditing);
  
  // Função para iniciar a edição
  const handleEdit = () => {
    setEditingMode(true);
    onEdit();
  };
  
  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditingMode(false);
    onCancelEdit();
  };
  
  // Função para salvar as alterações
  const handleSaveEdit = (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
  }>) => {
    onSaveEdit(workpackageId, alocacoes);
    setEditingMode(false);
  };
  
  return (
    <div className="relative">
      {editingMode ? (
        // Mostrar o Form quando estiver no modo de edição
        <Form
          workpackageId={workpackageId}
          inicio={inicio}
          fim={fim}
          utilizadores={utilizadores}
          onAddAlocacao={handleSaveEdit}
          onCancel={handleCancelEdit}
          recursoEmEdicao={recurso}
        />
      ) : (
        // Mostrar o Item quando não estiver no modo de edição
        <Item
          userId={userId}
          recurso={recurso}
          membroEquipa={membroEquipa}
          isExpanded={isExpanded}
          workpackageId={workpackageId}
          onToggleExpand={onToggleExpand}
          onEdit={handleEdit}
          onRemove={onRemove}
          formatarDataSegura={formatarDataSegura}
          alocacoesPorAnoMes={alocacoesPorAnoMes}
        />
      )}
    </div>
  );
} 