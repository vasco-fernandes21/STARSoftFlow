import { User as UserIcon, Edit, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Decimal } from "decimal.js";
import { Form } from "./form";

interface User {
  id: string;
  name: string;
  email: string;
  regime: string | null;
}

interface Alocacao {
  mes: number;
  ano: number;
  ocupacao: Decimal;
  workpackageId?: string;
}

interface ItemProps {
  user: User;
  alocacoes: Alocacao[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  inicio: Date;
  fim: Date;
  projetoEstado: "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO";
  onUpdateAlocacao: (userId: string, alocacoes: Alocacao[]) => void;
  workpackageId: string;
  utilizadores: User[];
}

export function Item({
  user,
  alocacoes,
  isExpanded,
  onToggleExpand,
  onRemove,
  inicio,
  fim,
  projetoEstado,
  onUpdateAlocacao,
  workpackageId,
  utilizadores,
}: ItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Calcular ocupação total
  const ocupacaoTotal = alocacoes.reduce((acc, curr) => acc + Number(curr.ocupacao), 0);

  // Filtrar apenas o utilizador atual para o Form de edição
  const utilizadoresDisponiveis = utilizadores.filter(u => u.id === user.id);

  // Log para verificar as props recebidas, especialmente 'alocacoes'
  console.log(`[Item Component] Props recebidas para User: ${user.name} (ID: ${user.id})`, { alocacoes, workpackageId });

  const [showForm, setShowForm] = useState(false);

  // Ensure valid dates
  const validInicio = inicio instanceof Date ? inicio : new Date(inicio || Date.now());
  const validFim = fim instanceof Date ? fim : new Date(fim || Date.now());

  // Organizar alocações por ano e mês
  const alocacoesPorAnoMes = (alocacoes || []).reduce(
    (acc, alocacao) => {
      const ano = alocacao.ano;
      if (!acc[ano]) {
        acc[ano] = {};
      }
      acc[ano]![alocacao.mes] = Number(alocacao.ocupacao) * 100;
      return acc;
    },
    {} as Record<string, Record<number, number>>
  );

  // Função para validar entrada de ocupação
  const validarEntrada = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const teclasSistema = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
    if (teclasSistema.includes(e.key)) return;

    const caracteresPermitidos = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "."];
    if (!caracteresPermitidos.includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Se for o primeiro caractere, só permitir 0 ou 1
    if (e.currentTarget.value.length === 0 && !["0", "1"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Após o primeiro dígito, aplicar regras específicas
    if (e.currentTarget.value.length === 1) {
      // Se o primeiro caractere é 1, não permitir mais caracteres
      if (e.currentTarget.value === "1") {
        e.preventDefault();
        return;
      }
      
      // Se o primeiro caractere é 0, permitir apenas , ou .
      if (e.currentTarget.value === "0" && ![",", "."].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }
    
    // Verificar se já tem 3 casas decimais
    const partes = e.currentTarget.value.split(/[,.]/);
    const parteDecimal = partes[1];
    if (parteDecimal && parteDecimal.length >= 3 && !teclasSistema.includes(e.key)) {
      e.preventDefault();
      return;
    }
  };

  // Função para abrir o formulário completo
  const handleOpenForm = () => {
    setShowForm(true);
  };

  // Função para lidar com atualizações via Form
  const handleFormUpdate = (
    workpackageId: string,
    alocacoes: Array<{
      userId: string;
      mes: number;
      ano: number;
      ocupacao: Decimal;
      workpackageId?: string;
      user?: any;
    }>
  ) => {
    const alocacoesComWorkpackage = alocacoes.map(alocacao => ({
      ...alocacao,
      workpackageId
    }));
    
    onUpdateAlocacao(user.id, alocacoesComWorkpackage);
    setShowForm(false);
  };

  return (
    <Card className="overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      <div className="flex cursor-pointer items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-azul/10">
            <UserIcon className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{user.name}</h5>
            <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
              {user.regime}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && !showForm ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenForm();
                }}
                className="h-7 w-7 rounded-lg p-0 text-azul hover:bg-azul/10"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-7 w-7 rounded-lg p-0 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}

          {!showForm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="h-7 w-7 rounded-lg p-0 hover:bg-azul/10"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-azul/70" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-azul/70" />
              )}
            </Button>
          )}
        </div>
      </div>

      {showForm ? (
        <div className="border-t border-azul/10">
          <Form
            workpackageId={workpackageId}
            inicio={validInicio}
            fim={validFim}
            utilizadores={utilizadoresDisponiveis}
            onAddAlocacao={handleFormUpdate}
            onCancel={() => setShowForm(false)}
            recursoEmEdicao={{
              userId: user.id,
              alocacoes: alocacoes.map((a) => ({
                ...a,
                ocupacao: new Decimal(a.ocupacao),
              })),
            }}
            projetoEstado={projetoEstado}
          />
        </div>
      ) : (
        isExpanded && (
          <AlocacoesGrid
            alocacoesPorAnoMes={alocacoesPorAnoMes}
            inicio={validInicio}
            fim={validFim}
            isEditing={isEditing}
            editValues={{}}
            setEditValues={() => {}}
            validarEntrada={validarEntrada}
            projetoEstado={projetoEstado}
          />
        )
      )}
    </Card>
  );
}

interface AlocacoesGridProps {
  alocacoesPorAnoMes: Record<string, Record<number, number>>;
  inicio: Date;
  fim: Date;
  isEditing: boolean;
  editValues: Record<string, string>;
  setEditValues: (values: Record<string, string>) => void;
  validarEntrada: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  projetoEstado: "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO";
}

function AlocacoesGrid({
  alocacoesPorAnoMes,
  inicio,
  fim,
  isEditing,
  editValues,
  setEditValues,
  validarEntrada,
  projetoEstado,
}: AlocacoesGridProps) {
  // Ensure dates are Date objects
  const inicioDate = inicio instanceof Date ? inicio : new Date(inicio);
  const fimDate = fim instanceof Date ? fim : new Date(fim);

  // Gerar array de anos entre início e fim
  const anos = Array.from(
    { length: fimDate.getFullYear() - inicioDate.getFullYear() + 1 },
    (_, i) => inicioDate.getFullYear() + i
  );

  // Função para gerar meses válidos para um ano específico
  const getMesesValidos = (ano: number) => {
    const meses = [];
    const mesInicio = ano === inicioDate.getFullYear() ? inicioDate.getMonth() + 1 : 1;
    const mesFim = ano === fimDate.getFullYear() ? fimDate.getMonth() + 1 : 12;

    for (let mes = mesInicio; mes <= mesFim; mes++) {
      meses.push(mes);
    }

    return meses;
  };

  // Função para determinar se uma alocação pode ser editada
  const canEditAllocation = (projetoEstado: string): boolean => {
    switch (projetoEstado) {
      case "RASCUNHO":
      case "PENDENTE":
        return true;
      case "APROVADO":
      case "EM_DESENVOLVIMENTO":
      case "CONCLUIDO":
        return false;
      default:
        return false;
    }
  };

  return (
    <div className="border-t border-azul/10 bg-azul/5">
      <div className="p-3">
        <div className="space-y-4">
          {anos.map((ano) => {
            const meses = alocacoesPorAnoMes[ano] || {};
            const mesesValidos = getMesesValidos(ano);

            return (
              <div key={ano} className="space-y-2">
                <h6 className="mb-2 text-xs font-medium text-azul/80">{ano}</h6>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {mesesValidos.map((mes) => {
                    const ocupacao = meses[mes] || 0;
                    const { badgeClass, progressClass } = getOcupacaoStyles(ocupacao);
                    const chave = `${ano}-${mes}`;
                    const isEditable = isEditing && canEditAllocation(projetoEstado);

                    return (
                      <div
                        key={chave}
                        className={`${badgeClass} rounded-md border p-2 ${ocupacao === 0 ? "opacity-50" : ""}`}
                      >
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span>{format(new Date(ano, mes - 1), "MMMM", { locale: pt })}</span>
                          {isEditable ? (
                            <Input
                              type="text"
                              value={editValues[chave] || ""}
                              onChange={(e) =>
                                setEditValues({ ...editValues, [chave]: e.target.value })
                              }
                              onKeyDown={validarEntrada}
                              className="h-6 w-16 text-center text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="font-medium">{ocupacao}%</span>
                          )}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
                          <div
                            className={`h-full ${progressClass} rounded-full transition-all duration-300`}
                            style={{ width: `${ocupacao}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getOcupacaoStyles(ocupacao: number) {
  if (ocupacao > 100) {
    return {
      badgeClass: "bg-red-50 text-red-600 border-red-200",
      progressClass: "bg-red-400",
    };
  } else if (ocupacao >= 80) {
    return {
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
      progressClass: "bg-emerald-400",
    };
  } else if (ocupacao >= 50) {
    return {
      badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
      progressClass: "bg-blue-400",
    };
  } else if (ocupacao >= 1) {
    return {
      badgeClass: "bg-amber-50 text-amber-600 border-amber-100",
      progressClass: "bg-amber-400",
    };
  }
  return {
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
    progressClass: "bg-gray-200",
  };
}
