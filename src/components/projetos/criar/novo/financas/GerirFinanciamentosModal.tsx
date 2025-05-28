import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, AlertCircle } from "lucide-react";
import { TextField } from "@/components/projetos/criar/components/FormFields";
import { PercentageField } from "@/components/projetos/criar/components/FormFields";
import { MoneyField } from "@/components/projetos/criar/components/FormFields";

// Tipo para o que vem da API
type FinanciamentoAPI = {
  id: number;
  nome: string;
  overhead: string;
  taxa_financiamento: string;
  valor_eti: string;
};

interface FinanciamentoResponse {
  items: FinanciamentoAPI[];
}

interface GerirFinanciamentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dadosPreenchidos?: {
    nome: string;
    overhead: number | null;
    taxa_financiamento: number | null;
    valor_eti: number | null;
  };
  onFinanciamentoCriado?: (financiamento: FinanciamentoAPI) => void;
}

// Tipo para novo financiamento usando number em vez de Decimal
type NovoFinanciamentoInput = {
  nome: string;
  overhead: number | null;
  taxa_financiamento: number | null;
  valor_eti: number | null;
};

export function GerirFinanciamentosModal({
  open,
  onOpenChange,
  dadosPreenchidos,
  onFinanciamentoCriado,
}: GerirFinanciamentosModalProps) {
  const [modoEdicao, setModoEdicao] = useState<number | null>(null);
  const [novoFinanciamento, setNovoFinanciamento] = useState<NovoFinanciamentoInput>({
    nome: dadosPreenchidos?.nome || "",
    overhead: dadosPreenchidos?.overhead ?? 0,
    taxa_financiamento: dadosPreenchidos?.taxa_financiamento ?? 0,
    valor_eti: dadosPreenchidos?.valor_eti ?? 0,
  });

  // Estado para confirmação de exclusão inline
  const [confirmarExclusao, setConfirmarExclusao] = useState<number | null>(null);

  // Atualizar o estado quando os dadosPreenchidos mudarem
  useEffect(() => {
    if (dadosPreenchidos) {
      setNovoFinanciamento({
        nome: dadosPreenchidos.nome || "",
        overhead: dadosPreenchidos.overhead || null,
        taxa_financiamento: dadosPreenchidos.taxa_financiamento || null,
        valor_eti: dadosPreenchidos.valor_eti || null,
      });
    }
  }, [dadosPreenchidos]);

  const utils = api.useUtils();

  const { data: financiamentosResponse } = api.financiamento.findAll.useQuery({
    limit: 100,
  }) as { data: FinanciamentoResponse | undefined };

  const financiamentos = (financiamentosResponse?.items || []) as FinanciamentoAPI[];

  const { mutate: criarFinanciamento, isPending } = api.financiamento.create.useMutation({
    onSuccess: (data) => {
      toast.success("Financiamento criado com sucesso!");
      if (onFinanciamentoCriado) {
        const financiamentoAPI: FinanciamentoAPI = {
          id: data.id,
          nome: data.nome,
          overhead: data.overhead.toString(),
          taxa_financiamento: data.taxa_financiamento.toString(),
          valor_eti: data.valor_eti.toString(),
        };
        onFinanciamentoCriado(financiamentoAPI);
      }
      limparForm();
      void utils.financiamento.findAll.invalidate();
    },
    onError: (error) => {
      console.error("Erro completo:", error);
      if (error.message.includes("CONFLICT")) {
        toast.error("Já existe um financiamento com este nome");
      } else if (error.message.includes("validation")) {
        toast.error("Por favor, verifique os valores inseridos");
      } else {
        toast.error(`Erro ao criar financiamento: ${error.message}`);
      }
    }
  });

  const { mutate: atualizarFinanciamento } = api.financiamento.update.useMutation({
    onSuccess: () => {
      toast.success("Financiamento atualizado com sucesso!");
      setModoEdicao(null);
      limparForm();
      void utils.financiamento.findAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar financiamento: ${error.message}`);
    },
  });

  const { mutate: removerFinanciamento } = api.financiamento.delete.useMutation({
    onSuccess: () => {
      toast.success("Financiamento removido com sucesso!");
      void utils.financiamento.findAll.invalidate();
    },
    onError: (error) => {
      if (error.message.includes("usado em projetos")) {
        toast.error("Não é possível remover um financiamento que está a ser usado em projetos");
      } else {
        toast.error(`Erro ao remover financiamento: ${error.message}`);
      }
    },
  });

  const limparForm = () => {
    setNovoFinanciamento({
      nome: "",
      overhead: 0,
      taxa_financiamento: 0,
      valor_eti: 0,
    });
  };

  const handleSubmit = () => {
    if (!novoFinanciamento.nome) {
      toast.error("O nome do financiamento é obrigatório");
      return;
    }

    try {
      // Garantir que todos os valores numéricos são válidos
      const dadosParaEnviar = {
        nome: novoFinanciamento.nome.trim(),
        overhead: Math.max(0, Math.min(100, Number(novoFinanciamento.overhead ?? 0))),
        taxa_financiamento: Math.max(0, Math.min(100, Number(novoFinanciamento.taxa_financiamento ?? 0))),
        valor_eti: Math.max(0, Number(novoFinanciamento.valor_eti ?? 0))
      };

      if (modoEdicao) {
        atualizarFinanciamento({
          id: modoEdicao,
          ...dadosParaEnviar,
        });
      } else {
        criarFinanciamento(dadosParaEnviar);
      }
    } catch (error) {
      console.error("Erro ao processar dados:", error);
      toast.error("Erro ao processar os dados do financiamento");
    }
  };

  const iniciarConfirmacaoExclusao = (id: number) => {
    setConfirmarExclusao(id);
  };

  const cancelarExclusao = () => {
    setConfirmarExclusao(null);
  };

  const confirmarExclusaoFinanciamento = (id: number) => {
    removerFinanciamento({ id });
    setConfirmarExclusao(null);
  };

  // Cancelar confirmação de exclusão quando iniciar edição de outro financiamento
  const iniciarEdicao = (financiamento: FinanciamentoAPI) => {
    setConfirmarExclusao(null); // Cancelar qualquer confirmação pendente
    setModoEdicao(financiamento.id);
    setNovoFinanciamento({
      nome: financiamento.nome,
      overhead: Number(Number(financiamento.overhead).toFixed(2)),
      taxa_financiamento: Number(Number(financiamento.taxa_financiamento).toFixed(2)),
      valor_eti: Number(Number(financiamento.valor_eti).toFixed(2)),
    });
  };

  useEffect(() => {
    if (dadosPreenchidos?.nome && financiamentosResponse?.items) {
      const tipoNormalizado = dadosPreenchidos.nome.trim().toLowerCase();
      const financiamentoExistente = financiamentosResponse.items.find(
        (f: FinanciamentoAPI) => f.nome.trim().toLowerCase() === tipoNormalizado
      );

      if (financiamentoExistente && onFinanciamentoCriado) {
        onFinanciamentoCriado(financiamentoExistente);
      }
    }
  }, [financiamentosResponse, dadosPreenchidos, onFinanciamentoCriado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-white rounded-xl border border-azul/10 shadow-lg">
        <DialogHeader className="border-b border-azul/10 pb-4">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-azul flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-azul/80" />
            Financiamentos Existentes
          </DialogTitle>
        </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-2">
            {/* Formulário */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-azul/10 pb-3">
                <Plus className="h-5 w-5 text-azul/80" />
                <h3 className="text-lg font-medium text-azul">
                  {modoEdicao ? "Editar Financiamento" : "Novo Financiamento"}
                </h3>
              </div>

              <div className="space-y-4">
                <TextField
                  label="Nome do Financiamento"
                  value={novoFinanciamento.nome}
                  onChange={(value) => setNovoFinanciamento((prev) => ({ ...prev, nome: value }))}
                  placeholder="Ex: Financiamento Base"
                  required
                  tooltip="Nome identificativo do financiamento"
                  className="bg-white"
                />

                <PercentageField
                  label="Overhead"
                  value={novoFinanciamento.overhead}
                  onChange={(value) => setNovoFinanciamento((prev) => ({ 
                    ...prev, 
                    overhead: value
                  }))}
                  tooltip="Percentagem de overhead aplicada ao financiamento (opcional)"
                  className="bg-white"
                  decimalPlaces={2}
                />

                <PercentageField
                  label="Taxa de Financiamento"
                  value={novoFinanciamento.taxa_financiamento}
                  onChange={(value) => setNovoFinanciamento((prev) => ({ 
                    ...prev, 
                    taxa_financiamento: value
                  }))}
                  required
                  tooltip="Taxa de financiamento aplicada ao projeto"
                  className="bg-white"
                  decimalPlaces={2}
                />

                <MoneyField
                  label="Valor ETI"
                  value={novoFinanciamento.valor_eti ?? 0}
                  onChange={(value) => setNovoFinanciamento((prev) => ({ 
                    ...prev, 
                    valor_eti: value !== null ? Number(Number(value).toFixed(2)) : 0 
                  }))}
                  required
                  tooltip="Valor do ETI (Equivalente a Tempo Integral)"
                  className="bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-azul/10">
                {modoEdicao && (
                  <Button
                    variant="outline"
                    className="rounded-full border-azul/20 text-azul hover:bg-azul/5 hover:text-azul/80 transition-all duration-200"
                    onClick={() => {
                      setModoEdicao(null);
                      limparForm();
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button 
                  className="rounded-full bg-azul text-white shadow-sm hover:bg-azul/90 hover:shadow-md transition-all duration-200"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {modoEdicao ? "Atualizar" : isPending ? "A criar..." : "Criar Financiamento"}
                </Button>
              </div>
            </div>

            {/* Lista de Financiamentos */}
            <div className="space-y-4 lg:border-l lg:border-azul/10 lg:pl-8">
              <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
                {financiamentos.map((financiamento: FinanciamentoAPI) => (
                  <div
                    key={financiamento.id}
                    className="group relative mb-4 p-4 rounded-lg border border-azul/10 bg-white/80 hover:bg-white hover:shadow-sm transition-all duration-200"
                  >
                    {confirmarExclusao === financiamento.id ? (
                      // Modo de confirmação
                      <div className="space-y-3">
                        <div className="text-center">
                          <p className="text-azul font-medium">Confirmar remoção?</p>
                          <p className="text-sm text-azul/70 mt-1">
                            "{financiamento.nome}" será removido permanentemente
                          </p>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-azul/20 text-azul hover:bg-azul/5"
                            onClick={cancelarExclusao}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full bg-red-500 text-white hover:bg-red-600"
                            onClick={() => confirmarExclusaoFinanciamento(financiamento.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Modo normal
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-azul text-lg">{financiamento.nome}</h4>
                          <div className="mt-2 space-y-2 text-sm text-azul/80">
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Overhead:</span>
                              <span className="bg-azul/5 px-2 py-0.5 rounded text-azul font-medium">
                                {Number(financiamento.overhead).toLocaleString("pt-PT", {
                                  style: "percent",
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Taxa:</span>
                              <span className="bg-azul/5 px-2 py-0.5 rounded text-azul font-medium">
                                {Number(financiamento.taxa_financiamento).toLocaleString("pt-PT", {
                                  style: "percent",
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="font-medium">ETI:</span>
                              <span className="bg-azul/5 px-2 py-0.5 rounded text-azul font-medium">
                                {Number(financiamento.valor_eti).toLocaleString("pt-PT", {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-azul/60 hover:bg-azul/5 hover:text-azul transition-colors"
                            onClick={() => iniciarEdicao(financiamento)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-red-500/60 hover:bg-red-50 hover:text-red-500 transition-colors"
                            onClick={() => iniciarConfirmacaoExclusao(financiamento.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
