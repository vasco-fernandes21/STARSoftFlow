"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField } from "@/components/ui/form";
import { Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutations } from "@/hooks/useMutations";
import { usePermissions } from "@/hooks/usePermissions";
import {
  TextField,
  TextareaField,
  DateField,
  SelectField,
  PercentageField,
  MoneyField,
} from "./criar/components/FormFields";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";

// Schema for the form
const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  inicio: z.date().nullable(),
  fim: z.date().nullable(),
  overhead: z.number().min(0, "Overhead deve ser pelo menos 0"),
  taxa_financiamento: z.number().min(0, "Taxa de financiamento deve ser pelo menos 0"),
  valor_eti: z.number().min(0, "Valor ETI deve ser pelo menos 0"),
  financiamentoId: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditarProjetoProps {
  projeto: {
    id: string;
    nome: string;
    descricao?: string | null;
    inicio?: Date | null;
    fim?: Date | null;
    overhead: number;
    taxa_financiamento: number;
    valor_eti: number;
    financiamentoId?: number | null;
    responsavel?: { name?: string | null } | null;
    responsavelId?: string;
  };
  financiamentos: Array<{
    id: number;
    nome: string;
  }>;
  renderTrigger?: React.ReactNode;
}

export function EditarProjeto({ projeto, financiamentos, renderTrigger }: EditarProjetoProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { projeto: projetoMutations } = useMutations(projeto.id);
  const { isAdmin, isGestor } = usePermissions();
  const { data: session } = useSession();

  // Garantir valores seguros para o formulário
  const formDefaultValues = useMemo(
    () => ({
      nome: projeto.nome,
      descricao: projeto.descricao ?? "",
      inicio: projeto.inicio ? new Date(projeto.inicio) : null,
      fim: projeto.fim ? new Date(projeto.fim) : null,
      overhead: projeto.overhead ?? 0,
      taxa_financiamento: projeto.taxa_financiamento ?? 0,
      valor_eti: projeto.valor_eti ?? 0,
      financiamentoId: projeto.financiamentoId ?? undefined,
    }),
    [projeto]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaultValues,
  });

  // Check if user has permission to edit
  const canEdit = useMemo(() => {
    const isResponsavel = projeto.responsavelId === session?.user?.id;
    return isAdmin || isGestor || isResponsavel;
  }, [isAdmin, isGestor, projeto.responsavelId, session?.user?.id]);

  // If user can't edit, don't render anything
  if (!canEdit) return null;

  const { isPending } = projetoMutations.update;

  function onSubmit(data: FormValues) {
    // Prepare data for mutation
    const submitData = {
      id: projeto.id,
      nome: data.nome,
      descricao: data.descricao === "" ? undefined : data.descricao,
      inicio: data.inicio || undefined,
      fim: data.fim || undefined,
      overhead: data.overhead,
      taxa_financiamento: data.taxa_financiamento,
      valor_eti: data.valor_eti,
      financiamentoId: data.financiamentoId,
    };

    projetoMutations.update.mutate(submitData, {
      onSuccess: () => {
        toast({
          title: "Projeto atualizado",
          description: "As alterações foram guardadas com sucesso.",
        });
        setOpen(false);
      },
      onError: (error) => {
        console.error("Erro ao atualizar projeto:", error);
        toast({
          title: "Erro ao atualizar",
          description: error.message || "Ocorreu um erro ao atualizar o projeto.",
          variant: "destructive",
        });
      },
    });
  }

  const financiamentoOptions = [
    { value: "none", label: "Nenhum" },
    ...financiamentos.map((f) => ({ value: f.id.toString(), label: f.nome })),
  ];

  const getNomeResponsavel = () => {
    try {
      if (!projeto.responsavel) return "Sem responsável";
      if (!projeto.responsavel.name) return "Sem nome definido";
      return projeto.responsavel.name;
    } catch (error) {
      console.error("Erro ao obter nome do responsável:", error);
      return "Erro ao obter responsável";
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2 text-slate-600 transition-colors hover:border-azul hover:text-azul"
    >
      <Pencil className="h-4 w-4" />
      Editar
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{renderTrigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="rounded-lg shadow-lg sm:max-w-2xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Editar Projeto</DialogTitle>
          <DialogDescription className="pt-1 text-sm text-muted-foreground">
            Atualize as informações principais do projeto.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
            {/* Grid for Name and Responsavel */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    label="Nome do Projeto"
                    required
                    placeholder="Nome do projeto"
                    value={field.value}
                    onChange={field.onChange}
                    helpText={error?.message}
                  />
                )}
              />
              {/* Campo do responsável sem integração com o formulário */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="responsavel-display" className="text-sm font-medium">
                  Responsável
                </Label>
                <div
                  id="responsavel-display"
                  className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                >
                  {getNomeResponsavel()}
                </div>
              </div>
            </div>

            {/* Description Field */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field, fieldState: { error } }) => (
                <TextareaField
                  label="Descrição"
                  placeholder="Descrição do projeto"
                  value={field.value || ""}
                  onChange={field.onChange}
                  helpText={error?.message}
                />
              )}
            />

            {/* Grid for Dates */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="inicio"
                render={({ field, fieldState: { error } }) => (
                  <DateField
                    label="Data de Início"
                    value={field.value}
                    onChange={field.onChange}
                    maxDate={form.watch("fim") ?? undefined}
                    helpText={error?.message}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="fim"
                render={({ field, fieldState: { error } }) => (
                  <DateField
                    label="Data de Fim"
                    value={field.value}
                    onChange={field.onChange}
                    minDate={form.watch("inicio") ?? undefined}
                    helpText={error?.message}
                  />
                )}
              />
            </div>

            {/* Grid for Financiamento and Overhead */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="financiamentoId"
                render={({ field, fieldState: { error } }) => (
                  <SelectField
                    label="Financiamento"
                    placeholder="Selecione um financiamento"
                    options={financiamentoOptions}
                    value={field.value?.toString() || "none"}
                    onChange={(value) => {
                      field.onChange(value === "none" ? undefined : Number(value));
                    }}
                    helpText={error?.message}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="overhead"
                render={({ field, fieldState: { error } }) => (
                  <PercentageField
                    label="Overhead (%)"
                    value={field.value}
                    onChange={field.onChange}
                    helpText={error?.message || "Percentagem de overhead do projeto"}
                  />
                )}
              />
            </div>

            {/* Grid for Taxa Financiamento and Valor ETI */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="taxa_financiamento"
                render={({ field, fieldState: { error } }) => (
                  <PercentageField
                    label="Taxa de Financiamento (%)"
                    value={field.value}
                    onChange={field.onChange}
                    helpText={error?.message || "Taxa de financiamento aplicada"}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="valor_eti"
                render={({ field, fieldState: { error } }) => (
                  <MoneyField
                    label="Valor ETI (€)"
                    value={field.value}
                    onChange={field.onChange}
                    helpText={error?.message || "Valor total do projeto"}
                  />
                )}
              />
            </div>

            <DialogFooter className="gap-2 pt-6 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isPending ? "A guardar..." : "Guardar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
