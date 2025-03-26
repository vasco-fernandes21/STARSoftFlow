import { useState } from "react";
import { Item } from "./item";
import { Form } from "./form";
import { Decimal } from "decimal.js";

interface User {
  id: string;
  name: string;
  email: string;
  regime: string;
}

interface Alocacao {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: string;
  user: User;
}

interface DetailsProps {
  userId: string;
  recurso: {
    userId: string;
    alocacoes: Array<{
      mes: number;
      ano: number;
      ocupacao: number;
    }>;
  };
  membroEquipa: {
    id: string;
    name: string | null;
    email: string | null;
    regime: string;
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
  projetoEstado: "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO";
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
  fim,
  projetoEstado
}: DetailsProps) {
  // Se estiver editando, mostrar o formulário
  if (isEditing) {
    return (
      <Form
        key={`form-${userId}`}
        workpackageId={workpackageId}
        inicio={inicio}
        fim={fim}
        utilizadores={utilizadores}
        onAddAlocacao={onSaveEdit}
        onCancel={onCancelEdit}
        recursoEmEdicao={recurso}
        projetoEstado={projetoEstado}
      />
    );
  }

  // Caso contrário, mostrar o item normal
  return (
    <Item
      key={userId}
      user={membroEquipa ? {
        id: membroEquipa.id,
        name: membroEquipa.name || "",
        email: membroEquipa.email || "",
        regime: membroEquipa.regime
      } : {
        id: userId,
        name: "Utilizador não encontrado",
        email: "",
        regime: "N/A"
      }}
      alocacoesPorAnoMes={alocacoesPorAnoMes}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onEdit={onEdit}
      onRemove={onRemove}
      inicio={inicio}
      fim={fim}
    />
  );
} 