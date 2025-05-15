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
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  TextField,
  TextareaField,
  DateField,
  SelectField,
  PercentageField,
  MoneyField,
} from "./criar/components/FormFields";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

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
  const { isAdmin, isGestor } = usePermissions();
  const { data: session } = useSession();
  const utils = api.useUtils();

  // Mutation para atualizar projeto
  const updateProjeto = api.projeto.update.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projeto.id);
      toast.success("Projeto atualizado com sucesso!");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao atualizar projeto:", error);
      toast.error("Ocorreu um erro ao atualizar o projeto.");
    },
  });

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

    updateProjeto.mutate(submitData);
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
      className="flex items-center gap-2 border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-200 hover:scale-105 hover:border-azul hover:bg-azul hover:text-white"
    >
      <Pencil className="h-4 w-4" />
      Editar
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{renderTrigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="glass-card max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white/95 p-0 shadow-xl backdrop-blur-sm sm:max-w-4xl">
        <DialogHeader className="border-b border-gray-100/50 bg-gradient-to-br from-white to-gray-50/50 p-6">
          <DialogTitle className="text-xl font-semibold tracking-tight text-azul">Editar Projeto</DialogTitle>
          <DialogDescription className="pt-1.5 text-sm text-gray-500">
            Atualize as informações principais do projeto.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6">
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
              <TextField
                label="Responsável"
                value={getNomeResponsavel()}
                onChange={() => {}}
                disabled
                className="opacity-90"
              />
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

            <DialogFooter className="gap-2 border-t border-gray-100/50 pt-6 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateProjeto.isPending}
                className="flex items-center gap-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50/80"
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateProjeto.isPending} 
                className="flex items-center gap-2 bg-azul text-white transition-colors hover:bg-azul/90"
              >
                <Save className="h-4 w-4" />
                {updateProjeto.isPending ? "A guardar..." : "Guardar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
