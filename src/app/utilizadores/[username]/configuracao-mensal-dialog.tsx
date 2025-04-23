import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/ui/icons";
import { Settings } from "lucide-react";

interface ConfiguracaoMensal {
  mes: number;
  ano: number;
  diasUteis: number;
  horasPotenciais: number;
  id?: string;
  updatedAt?: string;
}

interface ConfiguracaoMensalDialogProps {
  ano: number;
  onSuccess?: () => void;
  permissao: string;
}

const meses = Array.from({ length: 12 }, (_, i) => i + 1);

export function ConfiguracaoMensalDialog({ ano, onSuccess, permissao }: ConfiguracaoMensalDialogProps) {
  const [open, setOpen] = useState(false);
  const [configs, setConfigs] = useState<ConfiguracaoMensal[]>(() =>
    meses.map(mes => ({
      mes,
      ano,
      diasUteis: 20,
      horasPotenciais: 160,
      id: undefined,
      updatedAt: undefined,
    }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const podeEditar = ["ADMIN", "GESTOR"].includes(permissao);

  // Buscar todas as configs do ano
  const { data: apiConfigs, isLoading: isLoadingConfig, refetch } = api.utilizador.listarConfiguracoesMensais.useQuery(
    { ano },
    { enabled: open }
  );

  // Atualizar configs locais quando carregar da API
  useEffect(() => {
    if (apiConfigs?.items) {
      const newConfigs = meses.map(mes => {
        const found = apiConfigs.items.find((c: any) => c.mes === mes);
        if (found) {
          return {
            mes,
            ano,
            diasUteis: found.diasUteis,
            horasPotenciais: Number(found.horasPotenciais),
            id: found.id,
            updatedAt: found.updatedAt ? new Date(found.updatedAt).toISOString() : undefined,
          };
        }
        
        return {
          mes,
          ano,
          diasUteis: 20,
          horasPotenciais: 160,
          id: undefined,
          updatedAt: undefined,
        };
      });
      setConfigs(newConfigs);
    }
  }, [apiConfigs, ano]);

  // Mutation para guardar todos os meses
  const upsertMutation = api.utilizador.upsertConfiguracaoMensal.useMutation();

  // Handler para editar campos
  function handleChange(idx: number, field: "diasUteis" | "horasPotenciais", value: string) {
    setConfigs(prev => {
      const copy = [...prev];
      const config = copy[idx];
      if (!config) return copy;

      copy[idx] = {
        mes: config.mes,
        ano: config.ano,
        diasUteis: field === "diasUteis" ? parseInt(value, 10) || 0 : config.diasUteis,
        horasPotenciais: field === "horasPotenciais" ? parseFloat(value) || 0 : config.horasPotenciais,
        id: config.id,
        updatedAt: config.updatedAt,
      };
      return copy;
    });
  }

  // Guardar todas as configs
  async function handleSaveAll() {
    if (!podeEditar) return;
    setIsLoading(true);
    try {
      await Promise.all(
        configs.map(cfg =>
          upsertMutation.mutateAsync({
            mes: cfg.mes,
            ano: cfg.ano,
            diasUteis: cfg.diasUteis,
            horasPotenciais: cfg.horasPotenciais,
          })
        )
      );
      toast({ title: "Configurações guardadas!" });
      setOpen(false);
      if (onSuccess) onSuccess();
      void refetch();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="mr-2 h-4 w-4" />
        Configuração Mensal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configuração Mensal</DialogTitle>
            <DialogDescription>
              {ano}
              <span className="ml-2 text-xs text-muted-foreground">(podes editar todos os meses do ano)</span>
            </DialogDescription>
          </DialogHeader>

          {isLoadingConfig ? (
            <div className="flex h-32 items-center justify-center">
              <Icons.spinner className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              {configs.map((config, idx) => (
                <div key={config.mes} className="space-y-2 border rounded-lg p-4 bg-slate-50">
                  <div className="font-medium text-slate-700">
                    {format(new Date(config.ano, config.mes - 1), "MMMM", { locale: pt })}
                  </div>
                  <Label htmlFor={`diasUteis-${config.mes}`}>Dias Úteis</Label>
                  <Input
                    id={`diasUteis-${config.mes}`}
                    type="number"
                    min={0}
                    max={31}
                    value={config.diasUteis}
                    onChange={e => handleChange(idx, "diasUteis", e.target.value)}
                    disabled={!podeEditar || isLoading}
                  />
                  <Label htmlFor={`horasPotenciais-${config.mes}`}>Horas Potenciais</Label>
                  <Input
                    id={`horasPotenciais-${config.mes}`}
                    type="number"
                    min={0}
                    step={0.5}
                    value={config.horasPotenciais}
                    onChange={e => handleChange(idx, "horasPotenciais", e.target.value)}
                    disabled={!podeEditar || isLoading}
                  />
                  {config.updatedAt && (
                    <div className="text-xs text-muted-foreground">
                      Última atualização: {format(new Date(config.updatedAt), "dd/MM/yyyy HH:mm", { locale: pt })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!podeEditar && (
            <p className="text-sm text-muted-foreground mt-2">
              Apenas administradores e gestores podem editar configurações mensais.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={!podeEditar || isLoading}
            >
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Todas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 