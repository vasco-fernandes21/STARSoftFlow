import { useState } from "react";
import { Decimal } from "decimal.js";
import { Form } from "./form";
import { Item } from "./item";

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
  isEditing: boolean;
  onCancelEdit: () => void;
  onSaveEdit: (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
  }>) => void;
  utilizadores: Array<{ id: string; name: string; email: string; regime: string }>;
  inicio: Date;
  fim: Date;
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
  isEditing,
  onCancelEdit,
  onSaveEdit,
  utilizadores,
  inicio,
  fim
}: DetailsProps) {
  
  // Renderiza o formulário de edição ou o item com base no estado de edição
  return isEditing ? (
    <Form 
      workpackageId={workpackageId}
      inicio={inicio}
      fim={fim}
      utilizadores={utilizadores}
      onAddAlocacao={onSaveEdit}
      onCancel={onCancelEdit}
      recursoEmEdicao={recurso}
    />
  ) : (
    <Item
      userId={userId}
      recurso={recurso}
      membroEquipa={membroEquipa}
      isExpanded={isExpanded}
      workpackageId={workpackageId}
      onToggleExpand={onToggleExpand}
      onEdit={onEdit}
      onRemove={onRemove}
      formatarDataSegura={formatarDataSegura}
      alocacoesPorAnoMes={alocacoesPorAnoMes}
    />
  );
} 