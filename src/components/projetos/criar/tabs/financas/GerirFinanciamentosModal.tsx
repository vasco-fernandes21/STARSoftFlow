import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberField } from "@/components/projetos/criar/components/FormFields";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, AlertCircle } from "lucide-react";
import { type Financiamento } from "@prisma/client";
import { useConfirmacao } from "@/providers/PopupConfirmacaoProvider";
import { TextField } from "@/components/projetos/criar/components/FormFields";
import { DecimalField } from "@/components/projetos/criar/components/FormFields";
import { MoneyField } from "@/components/projetos/criar/components/FormFields";

interface GerirFinanciamentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tipo para novo financiamento usando number em vez de Decimal
type NovoFinanciamentoInput = {
  nome: string;
  overhead: number | null;
  taxa_financiamento: number | null;
  valor_eti: number | null;
};

export function GerirFinanciamentosModal({ open, onOpenChange }: GerirFinanciamentosModalProps) {
  const [modoEdicao, setModoEdicao] = useState<number | null>(null);
  const [novoFinanciamento, setNovoFinanciamento] = useState<NovoFinanciamentoInput>({
    nome: "",
    overhead: null,
    taxa_financiamento: null,
    valor_eti: null
  });

  const { confirmar } = useConfirmacao();
  const utils = api.useUtils();
  
  const { data: financiamentos } = api.financiamento.getAll.useQuery({
    limit: 10
  });
  
  const { mutate: criarFinanciamento } = api.financiamento.create.useMutation({
    onSuccess: () => {
      toast.success("Financiamento criado com sucesso!");
      limparForm();
      void utils.financiamento.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar financiamento: ${error.message}`);
    }
  });

  const { mutate: atualizarFinanciamento } = api.financiamento.update.useMutation({
    onSuccess: () => {
      toast.success("Financiamento atualizado com sucesso!");
      setModoEdicao(null);
      limparForm();
      void utils.financiamento.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar financiamento: ${error.message}`);
    }
  });

  const { mutate: removerFinanciamento } = api.financiamento.delete.useMutation({
    onSuccess: () => {
      toast.success("Financiamento removido com sucesso!");
      void utils.financiamento.getAll.invalidate();
    },
    onError: (error) => {
      if (error.message.includes("usado em projetos")) {
        toast.error("Não é possível remover um financiamento que está a ser usado em projetos");
      } else {
        toast.error(`Erro ao remover financiamento: ${error.message}`);
      }
    }
  });

  const limparForm = () => {
    setNovoFinanciamento({
      nome: "",
      overhead: null,
      taxa_financiamento: null,
      valor_eti: null
    });
  };

  const handleSubmit = () => {
    if (!novoFinanciamento.nome) {
      toast.error("O nome do financiamento é obrigatório");
      return;
    }

    // Validar se todos os campos numéricos estão preenchidos
    if (novoFinanciamento.overhead === null || 
        novoFinanciamento.taxa_financiamento === null || 
        novoFinanciamento.valor_eti === null) {
      toast.error("Todos os campos numéricos são obrigatórios");
      return;
    }

    const dadosParaEnviar = {
      nome: novoFinanciamento.nome,
      overhead: novoFinanciamento.overhead,
      taxa_financiamento: novoFinanciamento.taxa_financiamento,
      valor_eti: novoFinanciamento.valor_eti
    };

    if (modoEdicao) {
      atualizarFinanciamento({
        id: modoEdicao,
        ...dadosParaEnviar
      });
    } else {
      criarFinanciamento(dadosParaEnviar);
    }
  };

  const iniciarEdicao = (financiamento: Financiamento) => {
    setModoEdicao(financiamento.id);
    setNovoFinanciamento({
      nome: financiamento.nome,
      overhead: Number(financiamento.overhead),
      taxa_financiamento: Number(financiamento.taxa_financiamento),
      valor_eti: Number(financiamento.valor_eti)
    });
  };

  const handleRemoverFinanciamento = async (id: number, nome: string) => {
    try {
      const confirmado = await confirmar({
        titulo: "Remover Financiamento",
        descricao: `Tem certeza que deseja remover o financiamento "${nome}"? Esta ação não pode ser desfeita.`,
        tipo: "alerta",
        labelConfirmar: "Remover",
        labelCancelar: "Cancelar",
        destrutivo: true
      });

      if (confirmado) {
        removerFinanciamento({ id: Number(id) });
      }
    } catch (error) {
      console.error("Erro ao remover financiamento:", error);
      toast.error("Erro ao tentar remover o financiamento");
    }
  };

  const handleOverheadChange = (value: number) => {
    setNovoFinanciamento(prev => ({
      ...prev,
      overhead: value
    }));
  };

  const handleTaxaFinanciamentoChange = (value: number) => {
    setNovoFinanciamento(prev => ({
      ...prev,
      taxa_financiamento: value
    }));
  };

  const handleValorEtiChange = (value: number) => {
    setNovoFinanciamento(prev => ({
      ...prev,
      valor_eti: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-azul tracking-tight">
            Gerir Financiamentos
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="space-y-6 bg-white/80 p-6 rounded-xl border border-azul/10">
            <div className="flex items-center gap-2 text-azul pb-2 border-b border-azul/10">
              <Plus className="h-5 w-5" />
              <h3 className="text-lg font-medium">
                {modoEdicao ? "Editar Financiamento" : "Novo Financiamento"}
              </h3>
            </div>
            
            <TextField
              label="Nome do Financiamento"
              value={novoFinanciamento.nome}
              onChange={(value) => setNovoFinanciamento(prev => ({ ...prev, nome: value }))}
              placeholder="Ex: Financiamento Base"
              required
              tooltip="Nome identificativo do financiamento"
            />
            
            <DecimalField
              label="Overhead"
              value={novoFinanciamento.overhead}
              onChange={(value) => setNovoFinanciamento(prev => ({ ...prev, overhead: value }))}
              suffix="%"
              min={0}
              max={100}
              step={0.01}
              required
              tooltip="Percentagem de overhead aplicada ao financiamento"
            />
            
            <DecimalField
              label="Taxa de Financiamento"
              value={novoFinanciamento.taxa_financiamento}
              onChange={(value) => setNovoFinanciamento(prev => ({ ...prev, taxa_financiamento: value }))}
              suffix="%"
              min={0}
              max={100}
              step={0.01}
              required
              tooltip="Taxa de financiamento aplicada ao projeto"
            />
            
            <MoneyField
              label="Valor ETI"
              value={novoFinanciamento.valor_eti}
              onChange={(value) => setNovoFinanciamento(prev => ({ ...prev, valor_eti: value }))}
              required
              tooltip="Valor do ETI (Equivalente a Tempo Integral)"
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-azul/10">
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
              <Button 
                className="bg-azul hover:bg-azul/90"
                onClick={handleSubmit}
              >
                {modoEdicao ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>

          {/* Lista de Financiamentos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-azul pb-4 border-b border-azul/10">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-lg font-medium">Financiamentos Existentes</h3>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {financiamentos?.items.map((financiamento) => (
                <Card 
                  key={financiamento.id} 
                  className="p-4 hover:bg-azul/5 transition-all duration-200 border-azul/10 bg-white/80"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-azul">{financiamento.nome}</h4>
                      <div className="mt-2 space-y-1 text-sm text-azul/80">
                        <p>Overhead: {(Number(financiamento.overhead)).toLocaleString('pt-PT', {
                          style: 'percent',
                          minimumFractionDigits: 2
                        })}</p>
                        <p>Taxa: {(Number(financiamento.taxa_financiamento)).toLocaleString('pt-PT', {
                          style: 'percent',
                          minimumFractionDigits: 2
                        })}</p>
                        <p>ETI: {Number(financiamento.valor_eti).toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR'
                        })}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-azul/10 text-azul/60 hover:text-azul"
                        onClick={() => iniciarEdicao(financiamento)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-red-50 text-red-500/60 hover:text-red-500"
                        onClick={() => void handleRemoverFinanciamento(financiamento.id, financiamento.nome)}
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
  );
}
