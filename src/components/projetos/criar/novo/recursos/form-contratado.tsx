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
import { TextField, TextareaField, DecimalField } from "@/components/projetos/criar/components/FormFields";

interface FormContratadoProps {
  onSuccess?: () => void;
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
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    identificacao: defaultValues?.identificacao || "",
    descricao: defaultValues?.descricao || "",
    salario: defaultValues?.salario || "",
    contratado: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const utils = api.useUtils();

  // Usar estado controlado se fornecido, caso contrário usar estado interno
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Atualizar valores do formulário quando defaultValues mudar
  useEffect(() => {
    if (defaultValues) {
      setFormValues(prev => ({
        ...prev,
        identificacao: defaultValues.identificacao || prev.identificacao,
        descricao: defaultValues.descricao || prev.descricao,
        salario: defaultValues.salario || prev.salario,
      }));
    }
  }, [defaultValues]);

  const resetFormAndClose = () => {
    setFormValues({ identificacao: "", descricao: "", salario: "", contratado: true });
    setErrors({});
    setIsSubmitting(false);
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formValues.identificacao?.trim()) {
      newErrors.identificacao = "Identificação é obrigatória";
    }
    if (formValues.salario && isNaN(Number(formValues.salario))) {
      newErrors.salario = "Valor inválido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserMutation = api.utilizador.create.useMutation({
    onSuccess: () => {
      toast.success("Contratado criado com sucesso!");
      utils.utilizador.findAll.invalidate();
      resetFormAndClose();
      if (onSuccess) onSuccess();
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
        salario: formValues.salario ? Number(formValues.salario) : undefined,
        contratado: true,
      };
      createUserMutation.mutate(userData);
    } catch {
      toast.error("Ocorreu um erro ao processar os dados do formulário");
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number | null) => {
    setFormValues((prev) => ({ 
      ...prev, 
      [field]: value !== null ? value.toString() : "" 
    }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="overflow-hidden rounded-2xl border-none bg-white/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-[500px]">
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader className="border-b border-white/20 bg-gradient-to-b from-azul/10 to-transparent p-6">
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

          <div className="space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6">
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
              <DecimalField
                label="€/Mês"
                value={formValues.salario}
                onChange={(value) => handleChange("salario", value)}
                step={0.01}
                min={0}
                max={100000}
                helpText={errors.salario}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
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
