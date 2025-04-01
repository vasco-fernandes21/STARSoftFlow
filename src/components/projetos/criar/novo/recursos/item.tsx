import { User as UserIcon, Edit, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Decimal } from "decimal.js";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  regime: string;
}

interface Alocacao {
  mes: number;
  ano: number;
  ocupacao: Decimal;
  workpackageId: string;
}

// Interface para representar a ocupação total de um utilizador por mês
interface OcupacaoMensal {
  mes: number;
  ocupacaoAprovada: number;
  ocupacaoPendente: number;
}

interface ItemProps {
  user: User;
  alocacoes: Alocacao[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
  inicio: Date;
  fim: Date;
  projetoEstado: "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO";
  onUpdateAlocacao: (userId: string, alocacoes: Alocacao[]) => void;
  ocupacaoMensal?: OcupacaoMensal[]; // Nova prop opcional para ocupações por mês
}

export function Item({
  user,
  alocacoes = [],
  isExpanded,
  onToggleExpand,
  onEdit,
  onRemove,
  inicio,
  fim,
  projetoEstado,
  onUpdateAlocacao,
  ocupacaoMensal = [], // Valor padrão para ocupações mensais
}: ItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Organizar alocações por ano e mês
  const alocacoesPorAnoMes = (alocacoes || []).reduce((acc, alocacao) => {
    const ano = alocacao.ano;
    if (!acc[ano]) {
      acc[ano] = {};
    }
    acc[ano]![alocacao.mes] = Number(alocacao.ocupacao) * 100;
    return acc;
  }, {} as Record<string, Record<number, number>>);

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

    // Se já tiver o primeiro dígito e não for vírgula ou ponto, bloquear segundo dígito
    if (
      e.currentTarget.value.length === 1 &&
      !/^[01]$/.test(e.currentTarget.value) &&
      !["0", "1", ",", "."].includes(e.key)
    ) {
      e.preventDefault();
      return;
    }

    // Verificar se já tem 3 casas decimais
    const partes = e.currentTarget.value.split(/[,.]/);
    const parteDecimal = partes[1];
    if (parteDecimal && parteDecimal.length >= 3 && !teclasSistema.includes(e.key)) {
      e.preventDefault();
      return;
    }
  };

  // Função para converter valor para número
  const parseValorOcupacao = (valor: string): number => {
    const valorNormalizado = valor.replace(",", ".");
    const num = parseFloat(valorNormalizado);
    if (isNaN(num)) return 0;
    if (num > 1) return 1;
    if (num < 0) return 0;
    return num;
  };

  // Função para iniciar edição
  const handleStartEdit = () => {
    const valoresIniciais = (alocacoes || []).reduce((acc, alocacao) => {
      const chave = `${alocacao.ano}-${alocacao.mes}`;
      acc[chave] = Number(alocacao.ocupacao).toFixed(3).replace(".", ",");
      return acc;
    }, {} as Record<string, string>);
    setEditValues(valoresIniciais);
    setIsEditing(true);
  };

  // Função para verificar se a ocupação vai estourar o limite
  const validarOcupacao = (mes: number, ano: number, valor: number): boolean => {
    // Encontrar a ocupação mensal para o mês específico
    const ocupacaoDoMes = ocupacaoMensal.find((o) => o.mes === mes);
    if (!ocupacaoDoMes) return true; // Se não tiver dados, permitir

    // Se for projeto aprovado, somar com as ocupações pendentes
    // Se for projeto pendente, somar com as ocupações aprovadas
    const isApproved = 
      projetoEstado === "APROVADO" || 
      projetoEstado === "EM_DESENVOLVIMENTO" ||
      projetoEstado === "CONCLUIDO";
      
    // Buscar a alocação atual para este mês neste workpackage
    const alocacaoAtual = alocacoes.find(a => a.mes === mes && a.ano === ano);
    const ocupacaoAtual = alocacaoAtual ? Number(alocacaoAtual.ocupacao) : 0;
    
    // Calcular quanto já está alocado em outros projetos
    const ocupacaoOutrosProjetos = isApproved 
      ? ocupacaoDoMes.ocupacaoPendente 
      : ocupacaoDoMes.ocupacaoAprovada;
      
    // Verifica se a nova ocupação somada com as outras excede 100%
    return (valor + ocupacaoOutrosProjetos) <= 1;
  };

  // Função para salvar edição
  const handleSaveEdit = () => {
    let temAvisos = false;
    
    const novasAlocacoes = alocacoes.map((alocacao) => {
      const chave = `${alocacao.ano}-${alocacao.mes}`;
      const valor = editValues[chave];
      if (!valor) return alocacao;

      const ocupacao = parseValorOcupacao(valor);
      
      // Verifica se a nova ocupação excede o limite
      if (!validarOcupacao(alocacao.mes, alocacao.ano, ocupacao)) {
        temAvisos = true;
        const ocupacaoDoMes = ocupacaoMensal.find((o) => o.mes === alocacao.mes);
        const ocupacaoOutros = projetoEstado === "APROVADO" 
          ? ocupacaoDoMes?.ocupacaoPendente || 0
          : ocupacaoDoMes?.ocupacaoAprovada || 0;
          
        toast.warning(
          `Atenção: A ocupação total para ${format(new Date(alocacao.ano, alocacao.mes - 1), "MMMM", { locale: pt })} 
          será de ${Math.min(((ocupacao + ocupacaoOutros) * 100), 100).toFixed(0)}%. 
          O valor ideal seria menor que 100%.`
        );
      }
      
      return {
        ...alocacao,
        ocupacao: new Decimal(ocupacao),
      };
    });

    // Avisar o utilizador dos meses com sobrealocação
    if (temAvisos) {
      toast.warning(
        "Existem meses com ocupação total acima de 100%. Verifique as alocações."
      );
    }

    onUpdateAlocacao(user.id, novasAlocacoes);
    setIsEditing(false);
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValues({});
  };

  return (
    <Card className="overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      <div
        className="flex cursor-pointer items-center justify-between p-3"
        onClick={onToggleExpand}
      >
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
          {!isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit();
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
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                className="h-7 rounded-lg px-2 text-xs text-green-600 hover:bg-green-50"
              >
                Guardar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="h-7 rounded-lg px-2 text-xs text-red-500 hover:bg-red-50"
              >
                Cancelar
              </Button>
            </>
          )}

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
        </div>
      </div>

      {isExpanded && (
        <AlocacoesGrid
          alocacoesPorAnoMes={alocacoesPorAnoMes}
          inicio={inicio}
          fim={fim}
          isEditing={isEditing}
          editValues={editValues}
          setEditValues={setEditValues}
          validarEntrada={validarEntrada}
          projetoEstado={projetoEstado}
          ocupacaoMensal={ocupacaoMensal}
        />
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
  ocupacaoMensal?: OcupacaoMensal[];
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
  ocupacaoMensal = [],
}: AlocacoesGridProps) {
  // Gerar array de anos entre início e fim
  const anos = Array.from(
    { length: fim.getFullYear() - inicio.getFullYear() + 1 },
    (_, i) => inicio.getFullYear() + i
  );

  // Função para gerar meses válidos para um ano específico
  const getMesesValidos = (ano: number) => {
    const meses = [];
    const mesInicio = ano === inicio.getFullYear() ? inicio.getMonth() + 1 : 1;
    const mesFim = ano === fim.getFullYear() ? fim.getMonth() + 1 : 12;

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
  
  // Função para obter a ocupação total para um mês específico
  const getOcupacaoTotal = (mes: number, ano: number): { atual: number, aprovada: number, pendente: number, total: number } => {
    // Ocupação atual neste projeto
    const atual = alocacoesPorAnoMes[ano]?.[mes] || 0;
    
    // Ocupações de outros projetos
    const ocupacaoDoMes = ocupacaoMensal.find(o => o.mes === mes);
    const aprovada = (ocupacaoDoMes?.ocupacaoAprovada || 0) * 100;
    const pendente = (ocupacaoDoMes?.ocupacaoPendente || 0) * 100;
    
    // Verificar se esta ocupação está sendo adicionada à parte aprovada ou pendente
    const isApproved = 
      projetoEstado === "APROVADO" || 
      projetoEstado === "EM_DESENVOLVIMENTO" ||
      projetoEstado === "CONCLUIDO";
    
    // Calcular o total (deve considerar que a alocação atual já pode estar incluída no total)
    const total = isApproved
      ? atual + pendente
      : atual + aprovada;
      
    return { atual, aprovada, pendente, total };
  };

  return (
    <div className="border-t border-azul/10 bg-azul/5">
      <div className="p-3">
        <div className="space-y-4">
          {anos.map((ano) => {
            const mesesValidos = getMesesValidos(ano);

            return (
              <div key={ano} className="space-y-2">
                <h6 className="mb-2 text-xs font-medium text-azul/80">{ano}</h6>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {mesesValidos.map((mes) => {
                    const ocupacao = alocacoesPorAnoMes[ano]?.[mes] || 0;
                    const ocupacaoInfo = getOcupacaoTotal(mes, ano);
                    const { badgeClass, progressClass } = getOcupacaoStyles(ocupacaoInfo.total);
                    const chave = `${ano}-${mes}`;
                    const isEditable = isEditing && canEditAllocation(projetoEstado);

                    return (
                      <div
                        key={chave}
                        className={`${badgeClass} rounded-md border p-2 ${ocupacao === 0 ? "opacity-50" : ""}`}
                      >
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span>{format(new Date(ano, mes - 1), "MMMM", { locale: pt })}</span>
                          <div className="flex flex-col items-end">
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
                            <span className="text-[9px] text-green-600">
                              Aprovado: {ocupacaoInfo.aprovada.toFixed(0)}%
                            </span>
                            <span className="text-[9px] text-amber-600">
                              Pendente: {ocupacaoInfo.pendente.toFixed(0)}%
                            </span>
                            <span className="text-[9px] text-azul/60">
                              Total: {ocupacaoInfo.total.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {/* Barra para ocupação atual */}
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
                            <div
                              className={`h-full ${progressClass} rounded-full transition-all duration-300`}
                              style={{ width: `${ocupacao}%` }}
                            />
                          </div>
                          {/* Barra para ocupação aprovada */}
                          <div className="h-1 overflow-hidden rounded-full bg-white/50">
                            <div
                              className="h-full rounded-full bg-green-400 transition-all duration-300"
                              style={{ width: `${ocupacaoInfo.aprovada}%` }}
                            />
                          </div>
                          {/* Barra para ocupação pendente */}
                          <div className="h-1 overflow-hidden rounded-full bg-white/50">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all duration-300"
                              style={{ width: `${ocupacaoInfo.pendente}%` }}
                            />
                          </div>
                          {/* Barra para ocupação total */}
                          <div className="h-1 overflow-hidden rounded-full bg-white/50">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${ocupacaoInfo.total}%` }}
                            />
                          </div>
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
      badgeClass: "bg-amber-50 text-amber-600 border-amber-100",
      progressClass: "bg-amber-400",
    };
  } else if (ocupacao >= 50) {
    return {
      badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
      progressClass: "bg-blue-400",
    };
  } else if (ocupacao >= 1) {
    return {
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
      progressClass: "bg-emerald-400",
    };
  }
  return {
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
    progressClass: "bg-gray-200",
  };
}
