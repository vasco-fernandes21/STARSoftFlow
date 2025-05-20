"use client";

import React, { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormProvider,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Permissao, Regime } from "@prisma/client";
import { api } from "@/trpc/react";
import { Loader2, Save, UserCog, Mail, Briefcase, BadgeEuro, FileText, Hash } from "lucide-react";
import { toast } from "sonner";

// Form schema
const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  n_colaborador: z.number().int().min(1, "O número de colaborador deve ser maior que zero").optional(),
  atividade: z.string().optional(),
  regime: z.enum(["INTEGRAL", "PARCIAL"]),
  permissao: z.enum(["ADMIN", "GESTOR", "COMUM"]),
  informacoes: z.string().optional(),
  salario: z.preprocess(
    (v) => (v === "" || v === null ? undefined : Number(v)),
    z.number().min(0, "O salário deve ser positivo").optional()
  ),
});

// Props interface
interface EditarUtilizadorFormProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    atividade: string | null;
    permissao: Permissao;
    regime: Regime;
    informacoes: string | null;
    salario: number | null;
    n_colaborador?: number;
  };
  onSave: () => void;
  onCancel: () => void;
}

export function EditarUtilizadorForm({ user, onSave, onCancel }: EditarUtilizadorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();

  // Set up form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name ?? "",
      email: user.email ?? "",
      n_colaborador: (user as any).n_colaborador ?? undefined,
      atividade: user.atividade ?? "",
      regime: user.regime,
      permissao: user.permissao,
      informacoes: user.informacoes ?? "",
      salario: user.salario ?? undefined,
    },
  });

  // TRPC mutation for updating user
  const updateUserMutation = api.utilizador.core.update.useMutation({
    onSuccess: () => {
      toast.success("Utilizador atualizado com sucesso", {
        description: "As informações foram guardadas."
      });
      onSave();
      utils.utilizador.core.findById.invalidate();
      utils.utilizador.core.findByUsername.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar utilizador", {
        description: error.message || "Ocorreu um erro inesperado."
      });
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: values,
      });
    } catch (error) {
      console.error("Erro ao atualizar utilizador:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mx-auto p-0 overflow-hidden">
        <div className="rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Cabeçalho */}
          <div className="border-b border-white/20 bg-gradient-to-b from-azul/10 to-transparent p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-azul/20 bg-azul/10">
                <UserCog className="h-6 w-6 text-azul" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Editar Utilizador
              </h2>
            </div>
          </div>

          {/* Conteúdo do formulário */}
          <div className="space-y-6 p-6 overflow-y-auto">
            {/* Primeira linha: Nome, Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center text-sm font-medium text-gray-700">
                      Nome <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          placeholder="Nome do utilizador" 
                          {...field} 
                          className={cn(
                            "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20",
                            form.formState.errors.name && "border-red-300 focus:ring-red-500/20"
                          )}
                        />
                      </FormControl>
                      <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center text-sm font-medium text-gray-700">
                      Email <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          placeholder="Email do utilizador" 
                          {...field} 
                          className={cn(
                            "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20",
                            form.formState.errors.email && "border-red-300 focus:ring-red-500/20"
                          )}
                        />
                      </FormControl>
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            {/* Segunda linha: Nº Colaborador, Função/Atividade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="n_colaborador"
                render={({ field }) => {
                  // Manter valor como string durante edição
                  const stringValue =
                    typeof field.value === "number"
                      ? String(field.value)
                      : field.value !== undefined && field.value !== null
                        ? field.value
                        : user.n_colaborador !== undefined && user.n_colaborador !== null
                          ? String(user.n_colaborador)
                          : "";
                  return (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Nº Colaborador
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Número do colaborador"
                            value={stringValue}
                            onChange={e => {
                              // Permitir vazio ou apenas números
                              const val = e.target.value;
                              if (/^\d*$/.test(val)) {
                                field.onChange(val);
                              }
                            }}
                            onBlur={e => {
                              const val = e.target.value;
                              if (val === "") {
                                field.onChange(undefined);
                              } else {
                                const num = Number(val);
                                if (isNaN(num) || num < 1) {
                                  field.onChange(1);
                                } else {
                                  field.onChange(num);
                                }
                              }
                              field.onBlur();
                            }}
                            className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20"
                          />
                        </FormControl>
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                      <FormDescription className="text-xs text-gray-500">
                        Número único do colaborador
                      </FormDescription>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="atividade"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Função/Atividade
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          placeholder="Função ou atividade principal" 
                          {...field} 
                          className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20"
                        />
                      </FormControl>
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            {/* Terceira linha: Regime, Permissão, Salário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="regime"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Regime
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20">
                          <SelectValue placeholder="Selecione o regime" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-gray-200 bg-white/90 shadow-lg backdrop-blur-md">
                        <div className="space-y-1 p-2">
                          <SelectItem value="INTEGRAL" className="rounded-lg hover:bg-green-50">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-600"></div>
                              <span className="font-medium">Integral</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="PARCIAL" className="rounded-lg hover:bg-orange-50">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                              <span className="font-medium">Parcial</span>
                            </div>
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-gray-500">
                      O regime de trabalho do utilizador
                    </FormDescription>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="permissao"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Permissão
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20">
                          <SelectValue placeholder="Selecione a permissão" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-gray-200 bg-white/90 shadow-lg backdrop-blur-md">
                        <div className="space-y-1 p-2">
                          <SelectItem value="ADMIN" className="rounded-lg hover:bg-purple-50">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-purple-600"></div>
                              <span className="font-medium">Admin</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="GESTOR" className="rounded-lg hover:bg-blue-50">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-azul"></div>
                              <span className="font-medium">Gestor</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="COMUM" className="rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                              <span className="font-medium">Comum</span>
                            </div>
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-gray-500">
                      Nível de acesso ao sistema
                    </FormDescription>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="salario"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Salário (€/Mês)
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Salário mensal"
                          value={field.value === null || field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : Number(value));
                          }}
                          className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20"
                        />
                      </FormControl>
                      <BadgeEuro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <FormDescription className="text-xs text-gray-500">
                      Salário mensal bruto do colaborador
                    </FormDescription>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />
            </div>

            {/* Informações Curriculares */}
            <FormField
              control={form.control}
              name="informacoes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Informações Curriculares
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Textarea 
                        placeholder="Informações curriculares e experiência profissional" 
                        className="min-h-[120px] resize-y rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm pl-9 focus:ring-2 focus:ring-azul/20" 
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FileText className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
                  </div>
                  <FormDescription className="text-xs text-gray-500">
                    Currículo resumido e informações relevantes sobre o colaborador
                  </FormDescription>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            {/* Mensagem de campos obrigatórios */}
            <div className="mt-2 flex items-center gap-1 px-1 text-xs text-gray-500">
              <span className="text-red-500">*</span> Campos obrigatórios
            </div>
          </div>

          {/* Rodapé com botões */}
          <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-full border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:bg-white/80 hover:text-gray-900 hover:shadow-md"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || !form.formState.isDirty}
              className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
} 