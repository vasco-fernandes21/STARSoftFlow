import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, AlertCircle } from "lucide-react";
import { TextField } from "@/components/projetos/criar/components/FormFields";
import { DecimalField } from "@/components/projetos/criar/components/FormFields";
import { MoneyField } from "@/components/projetos/criar/components/FormFields";

// Importar AlertDialog para substituir o useConfirmacao
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // Estados para o AlertDialog
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deleteFinanciamentoId, setDeleteFinanciamentoId] = useState<number | null>(null);
  const [deleteFinanciamentoNome, setDeleteFinanciamentoNome] = useState<string>("");

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

  const { mutate: criarFinanciamento } = api.financiamento.create.useMutation({
    onSuccess: (data) => {
      toast.success("Financiamento criado com sucesso!");

      // Chamar o callback com o financiamento criado, se existir
      if (onFinanciamentoCriado) {
        // Converter os dados retornados para o formato esperado
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
      toast.error(`Erro ao criar financiamento: ${error.message}`);
    },
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

    // Validar apenas taxa de financiamento e valor ETI como obrigatórios
    if (novoFinanciamento.taxa_financiamento === null || novoFinanciamento.valor_eti === null) {
      toast.error("Taxa de financiamento e Valor ETI são obrigatórios");
      return;
    }

    const dadosParaEnviar = {
      nome: novoFinanciamento.nome,
      overhead: Number((novoFinanciamento.overhead ?? 0) / 100), // Converte para decimal (25 -> 0.25)
      taxa_financiamento: Number((novoFinanciamento.taxa_financiamento ?? 0) / 100), // Converte para decimal (85 -> 0.85)
      valor_eti: Number(novoFinanciamento.valor_eti ?? 0), // Garante que é número
    };

    if (modoEdicao) {
      atualizarFinanciamento({
        id: modoEdicao,
        ...dadosParaEnviar,
      });
    } else {
      criarFinanciamento(dadosParaEnviar);
    }
  };

  const iniciarEdicao = (financiamento: FinanciamentoAPI) => {
    setModoEdicao(financiamento.id);
    setNovoFinanciamento({
      nome: financiamento.nome,
      overhead: Number((Number(financiamento.overhead) * 100).toFixed(2)), // Converte para percentagem (0.25 -> 25) com 2 casas
      taxa_financiamento: Number((Number(financiamento.taxa_financiamento) * 100).toFixed(2)), // Converte para percentagem (0.85 -> 85) com 2 casas
      valor_eti: Number(Number(financiamento.valor_eti).toFixed(2)), // Garante 2 casas decimais
    });
  };

  const openDeleteDialog = (id: number, nome: string) => {
    setDeleteFinanciamentoId(id);
    setDeleteFinanciamentoNome(nome);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteFinanciamentoId !== null) {
      removerFinanciamento({ id: deleteFinanciamentoId });
      setIsDeleteAlertOpen(false);
    }
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogOverlay className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="max-w-5xl z-[1001] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-azul">
              Gerir Financiamentos
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-8">
            {/* Formulário */}
            <div className="space-y-6 rounded-xl border border-azul/10 bg-white/80 p-6">
              <div className="flex items-center gap-2 border-b border-azul/10 pb-2 text-azul">
                <Plus className="h-5 w-5" />
                <h3 className="text-lg font-medium">
                  {modoEdicao ? "Editar Financiamento" : "Novo Financiamento"}
                </h3>
              </div>

              <TextField
                label="Nome do Financiamento"
                value={novoFinanciamento.nome}
                onChange={(value) => setNovoFinanciamento((prev) => ({ ...prev, nome: value }))}
                placeholder="Ex: Financiamento Base"
                required
                tooltip="Nome identificativo do financiamento"
              />

              <DecimalField
                label="Overhead"
                value={novoFinanciamento.overhead ?? 0}
                onChange={(value) => setNovoFinanciamento((prev) => ({ 
                  ...prev, 
                  overhead: value !== null ? Number(Number(value).toFixed(2)) : 0 
                }))}
                suffix="%"
                min={0}
                max={100}
                step={0.01}
                tooltip="Percentagem de overhead aplicada ao financiamento (opcional)"
              />

              <DecimalField
                label="Taxa de Financiamento"
                value={novoFinanciamento.taxa_financiamento ?? 0}
                onChange={(value) => setNovoFinanciamento((prev) => ({ 
                  ...prev, 
                  taxa_financiamento: value !== null ? Number(Number(value).toFixed(2)) : 0 
                }))}
                suffix="%"
                min={0}
                max={100}
                step={0.01}
                required
                tooltip="Taxa de financiamento aplicada ao projeto"
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
              />

              <div className="flex justify-end gap-3 border-t border-azul/10 pt-4">
                {modoEdicao && (
                  <Button
                    variant="outline"
                    className="border-azul/20 hover:bg-azul/5"
                    onClick={() => {
                      setModoEdicao(null);
                      limparForm();
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button className="bg-azul hover:bg-azul/90" onClick={handleSubmit}>
                  {modoEdicao ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>

            {/* Lista de Financiamentos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-azul/10 pb-4 text-azul">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-lg font-medium">Financiamentos Existentes</h3>
              </div>

              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                {financiamentos.map((financiamento: FinanciamentoAPI) => (
                  <Card
                    key={financiamento.id}
                    className="group relative mb-4 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-azul">{financiamento.nome}</h4>
                        <div className="mt-2 space-y-1 text-sm text-azul/80">
                          <p>
                            Overhead:{" "}
                            {(Number(financiamento.overhead) * 100).toLocaleString("pt-PT", {
                              style: "percent",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p>
                            Taxa:{" "}
                            {(Number(financiamento.taxa_financiamento) * 100).toLocaleString("pt-PT", {
                              style: "percent",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p>
                            ETI:{" "}
                            {Number(financiamento.valor_eti).toLocaleString("pt-PT", {
                              style: "currency",
                              currency: "EUR",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-azul/60 hover:bg-azul/10 hover:text-azul"
                          onClick={() => iniciarEdicao(financiamento)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500/60 hover:bg-red-50 hover:text-red-500"
                          onClick={() => openDeleteDialog(financiamento.id, financiamento.nome)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Financiamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover o financiamento "{deleteFinanciamentoNome}"? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
