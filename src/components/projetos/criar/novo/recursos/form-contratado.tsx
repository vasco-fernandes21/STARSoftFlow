"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { TextField, TextareaField, MoneyField } from "@/components/projetos/criar/components/FormFields";

interface FormContratadoProps {
  onSuccess?: (userId: string) => void;
  trigger?: React.ReactNode;
  defaultValues?: {
    identificacao: string;
    salario: string;
    descricao?: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FormContratado({ 
  onSuccess, 
  trigger, 
  defaultValues,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange 
}: FormContratadoProps) {
  // console.log("[FormContratado] Inicializado com props:", {
  //   hasOnSuccess: !!onSuccess,
  //   hasTrigger: !!trigger,
  //   defaultValues,
  //   controlledOpen,
  //   hasOnOpenChange: !!controlledOnOpenChange
  // });

  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const parseSalario = (salarioStr: string | undefined): number | null => {
    if (salarioStr === undefined || salarioStr.trim() === "") return null;
    const num = parseFloat(salarioStr.replace(",", "."));
    return isNaN(num) ? null : num;
  };

  const [formValues, setFormValues] = useState({
    identificacao: defaultValues?.identificacao || "",
    descricao: defaultValues?.descricao || "",
    salario: parseSalario(defaultValues?.salario),
    contratado: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const utils = api.useUtils();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // console.log("[FormContratado] Estado atual:", {
  //   open,
  //   isControlled: controlledOpen !== undefined,
  //   formValues
  // });

  useEffect(() => {
    // console.log("[FormContratado] defaultValues mudou:", defaultValues);
    if (defaultValues) {
      setFormValues(prev => ({
        ...prev,
        identificacao: defaultValues.identificacao || prev.identificacao,
        descricao: defaultValues.descricao || prev.descricao,
        salario: parseSalario(defaultValues.salario) ?? prev.salario,
      }));
    }
  }, [defaultValues]);

  const resetFormAndClose = () => {
    setFormValues({ identificacao: "", descricao: "", salario: null, contratado: true });
    setErrors({});
    setIsSubmitting(false);
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formValues.identificacao?.trim()) {
      newErrors.identificacao = "Identificação é obrigatória";
    }
    if (formValues.salario === null && defaultValues?.salario?.trim() !== "" && defaultValues?.salario !== undefined) {
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserMutation = api.utilizador.create.useMutation({
    onSuccess: (data) => {
      // console.log(`[Contratado] Criado com sucesso: ${data.name} (ID: ${data.id})`);
      toast.success(`Contratado ${data.name} criado com sucesso!`);
      utils.utilizador.findAll.invalidate();
      resetFormAndClose();
      if (onSuccess && data.id) {
        // console.log(`[Contratado] Chamando onSuccess com ID: ${data.id}`);
        onSuccess(data.id);
      }
    },
    onError: () => {
      toast.error("Ocorreu um erro ao criar o contratado.");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const userData = {
        name: formValues.identificacao.trim(),
        informacoes: formValues.descricao.trim() || undefined,
        salario: formValues.salario !== null ? formValues.salario : undefined,
        contratado: true,
      };
      createUserMutation.mutate(userData);
    } catch {
      toast.error("Ocorreu um erro ao processar os dados do formulário");
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number | null) => {
    if (field === "salario") {
      setFormValues((prev) => ({ ...prev, salario: value as number | null }));
    } else {
      setFormValues((prev) => ({ 
        ...prev, 
        [field]: value !== null ? String(value) : ""
      }));
    }
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Dialog modal={true} open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="fixed left-1/2 top-1/2 z-[1001] w-full max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-&lsqb;state=closed&rsqb;:slide-out-to-top-&lsqb;48%&rsqb data-[state=open]:slide-in-from-left-1/2 data-&lsqb;state=open&rsqb;:slide-in-from-top-&lsqb;48%&rsqb;">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-azul/20 bg-azul/10">
                <UserPlus className="h-6 w-6 text-azul" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Novo Contratado
                </DialogTitle>
                <DialogDescription className="text-gray-500">
                  Adicione um novo contratado ao sistema
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-6 px-1">
            {/* Identificação */}
            <TextField
              label="Identificação do contratado"
              value={formValues.identificacao}
              onChange={(value) => handleChange("identificacao", value)}
              placeholder="Nome, código ou referência do contratado"
              required
              helpText={errors.identificacao}
            />

            {/* Descrição */}
            <TextareaField
              label="Descrição da contratação"
              value={formValues.descricao}
              onChange={(value) => handleChange("descricao", value)}
              placeholder="Detalhes ou descrição da contratação"
              rows={3}
            />

            {/* Salário */}
            <MoneyField
              label="€/Mês"
              value={formValues.salario}
              onChange={(value) => handleChange("salario", value)}
              placeholder="0,000"
              helpText={errors.salario}
            />
          </div>

          <DialogFooter className="flex gap-2 pt-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:bg-white/80 hover:text-gray-900 hover:shadow-md"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  A criar...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar contratado
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
