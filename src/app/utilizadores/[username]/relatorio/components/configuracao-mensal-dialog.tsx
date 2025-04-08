import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/ui/icons";
import { Settings } from "lucide-react";

interface ConfiguracaoMensalDialogProps {
  mes: number;
  ano: number;
  onSuccess?: () => void;
  permissao: string;
}

export function ConfiguracaoMensalDialog({ mes, ano, onSuccess, permissao }: ConfiguracaoMensalDialogProps) {
  const [open, setOpen] = useState(false);
  const [diasUteis, setDiasUteis] = useState(20);
  const [horasPotenciais, setHorasPotenciais] = useState(160);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Verificar se o utilizador tem permissão para editar
  const podeEditar = ["ADMIN", "GESTOR"].includes(permissao);

  // Buscar configuração mensal
  const { data: configuracao, isLoading: isLoadingConfig, refetch } = api.utilizador.getConfiguracaoMensal.useQuery(
    { mes, ano },
    {
      enabled: open, // Só consulta quando o diálogo está aberto
    }
  );

  // Atualizar os valores quando a configuração for carregada
  useEffect(() => {
    if (configuracao) {
      setDiasUteis(configuracao.diasUteis);
      setHorasPotenciais(Number(configuracao.horasPotenciais));
    }
  }, [configuracao]);

  // Mutation para criar/atualizar configuração
  const upsertMutation = api.utilizador.upsertConfiguracaoMensal.useMutation({
    onSuccess: () => {
      toast({
        title: "Configuração atualizada",
        description: "A configuração mensal foi atualizada com sucesso.",
      });
      setOpen(false);
      if (onSuccess) onSuccess();
      void refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Ocorreu um erro ao atualizar a configuração mensal.",
      });
    },
  });

  const handleSubmit = async () => {
    if (!podeEditar) return;
    
    setIsLoading(true);
    try {
      await upsertMutation.mutateAsync({
        mes,
        ano,
        diasUteis,
        horasPotenciais,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="mr-2 h-4 w-4" />
        Configuração Mensal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configuração Mensal</DialogTitle>
            <DialogDescription>
              {format(new Date(ano, mes - 1), "MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {isLoadingConfig ? (
            <div className="flex h-32 items-center justify-center">
              <Icons.spinner className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diasUteis">Dias Úteis</Label>
                  <Input
                    id="diasUteis"
                    type="number"
                    min={0}
                    max={31}
                    value={diasUteis}
                    onChange={(e) => setDiasUteis(parseInt(e.target.value, 10) || 0)}
                    disabled={!podeEditar || isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horasPotenciais">Horas Potenciais</Label>
                  <Input
                    id="horasPotenciais"
                    type="number"
                    min={0}
                    step={0.5}
                    value={horasPotenciais}
                    onChange={(e) => setHorasPotenciais(parseFloat(e.target.value) || 0)}
                    disabled={!podeEditar || isLoading}
                  />
                </div>
              </div>
              
              {!podeEditar && (
                <p className="text-sm text-muted-foreground">
                  Apenas administradores e gestores podem editar configurações mensais.
                </p>
              )}
              
              {configuracao ? (
                <div className="text-sm text-muted-foreground">
                  <p>Última atualização: {format(new Date(configuracao.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Esta configuração mensal ainda não existe e será criada quando salvar.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={!podeEditar || isLoading}
            >
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 