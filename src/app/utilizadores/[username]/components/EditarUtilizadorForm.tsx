"use client";

import React, { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
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
import { Permissao, Regime } from "@prisma/client";
import { api } from "@/trpc/react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

// Form schema
const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  atividade: z.string().optional(),
  regime: z.enum(["INTEGRAL", "PARCIAL"]),
  permissao: z.enum(["ADMIN", "GESTOR", "COMUM"]),
  informacoes: z.string().optional(),
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
      atividade: user.atividade ?? "",
      regime: user.regime,
      permissao: user.permissao,
      informacoes: user.informacoes ?? "",
    },
  });

  // TRPC mutation for updating user
  const updateUserMutation = api.utilizador.updateUser.useMutation({
    onSuccess: () => {
      onSave();
      utils.utilizador.findById.invalidate();
      utils.utilizador.getByUsername.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar utilizador: ${error.message}`);
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        ...values,
      });
    } catch (error) {
      console.error("Erro ao atualizar utilizador:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do utilizador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email do utilizador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="atividade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função/Atividade</FormLabel>
              <FormControl>
                <Input placeholder="Função ou atividade principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="regime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regime</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INTEGRAL">Integral</SelectItem>
                    <SelectItem value="PARCIAL">Parcial</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  O regime de trabalho do utilizador
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="permissao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissão</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a permissão" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="COMUM">Comum</SelectItem>
                    <SelectItem value="GESTOR">Gestor</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Nível de acesso ao sistema
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="informacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informações Curriculares</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações curriculares e experiência profissional" 
                  className="min-h-[150px] resize-y" 
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Currículo resumido e informações relevantes sobre o colaborador
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={isLoading || !form.formState.isDirty}
            className="bg-azul hover:bg-azul/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 