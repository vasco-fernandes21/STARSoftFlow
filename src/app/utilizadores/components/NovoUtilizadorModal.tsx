"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { TRPCClientError } from "@trpc/client";

type Permissao = "ADMIN" | "GESTOR" | "COMUM";
type Regime = "PARCIAL" | "INTEGRAL";

interface ZodErrorData {
  zodError?: {
    fieldErrors: Record<string, string[]>;
  };
}

export function NovoUtilizadorModal() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    username: "",
    email: "",
    atividade: "",
    contratacao: new Date(),
    permissao: "COMUM" as Permissao,
    regime: "INTEGRAL" as Regime,
    password: "",
    sendWelcomeEmail: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const utils = api.useContext();

  const resetFormAndClose = () => {
    setFormValues({
      name: "",
      username: "",
      email: "",
      atividade: "",
      contratacao: new Date(),
      permissao: "COMUM" as Permissao,
      regime: "INTEGRAL" as Regime,
      password: "",
      sendWelcomeEmail: true,
    });
    setErrors({});
    setIsSubmitting(false);
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formValues.name?.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formValues.username?.trim()) {
      newErrors.username = "Nome de utilizador é obrigatório";
    } else if (formValues.username.includes(" ")) {
      newErrors.username = "Nome de utilizador não pode conter espaços";
    }

    if (!formValues.email?.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formValues.atividade?.trim()) {
      newErrors.atividade = "Atividade é obrigatória";
    }

    if (!formValues.contratacao) {
      newErrors.contratacao = "Data de contratação é obrigatória";
    }

    // Validação condicional para a password apenas se for preenchida
    if (formValues.password && formValues.password.length > 0) {
      if (formValues.password.length < 8) {
        newErrors.password = "Password deve ter pelo menos 8 caracteres";
      } else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
          formValues.password
        )
      ) {
        newErrors.password =
          "Password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserMutation = api.utilizador.create.useMutation({
    onSuccess: (data) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Resposta de sucesso:", data);
      }
      toast.success("Utilizador criado com sucesso!");
      utils.utilizador.findAll.invalidate();
      resetFormAndClose();
    },
    onError: (error) => {
      console.error("Erro detalhado:", error);

      if (error instanceof TRPCClientError) {
        const errorData = error.data as ZodErrorData;

        if (errorData?.zodError) {
          const errorMessages = Object.entries(errorData.zodError.fieldErrors)
            .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
            .join("; ");

          toast.error(`Erro de validação: ${errorMessages}`);
        } else {
          toast.error(error.message || "Ocorreu um erro ao criar o utilizador.");
        }
      } else {
        toast.error("Ocorreu um erro ao criar o utilizador.");
      }

      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Criar objeto com dados básicos
      const userData = {
        name: formValues.name.trim(),
        username: formValues.username.trim(),
        email: formValues.email.trim(),
        atividade: formValues.atividade.trim(),
        contratacao:
          formValues.contratacao instanceof Date
            ? formValues.contratacao.toISOString()
            : new Date().toISOString(),
        permissao: formValues.permissao,
        regime: formValues.regime,
      };

      // Log para depuração
      if (process.env.NODE_ENV === "development") {
        console.log("Dados a enviar:", userData);
      }

      // Adicionar password apenas se preenchida
      if (formValues.password && formValues.password.length > 0) {
        createUserMutation.mutate({
          ...userData,
          password: formValues.password,
        });
      } else {
        createUserMutation.mutate(userData);
      }
    } catch (error) {
      console.error("Erro ao preparar dados:", error);
      toast.error("Ocorreu um erro ao processar os dados do formulário");
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | Date | boolean) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg">
          <Plus className="h-4 w-4" />
          Novo Utilizador
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl border-none bg-white/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-[700px]">
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader className="border-b border-white/20 bg-gradient-to-b from-azul/10 to-transparent p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-azul/20 bg-azul/10">
                <UserPlus className="h-6 w-6 text-azul" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Novo Utilizador
                </DialogTitle>
                <DialogDescription className="text-gray-500">
                  Adicione um novo utilizador ao sistema
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  Primeiro e último nome <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formValues.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Insira o primeiro e último nome"
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                    errors.name && "border-red-300 focus:ring-red-500/20"
                  )}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  Nome de utilizador <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  value={formValues.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="nome.apelido"
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                    errors.username && "border-red-300 focus:ring-red-500/20"
                  )}
                />
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  Email <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="exemplo@empresa.com"
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                    errors.email && "border-red-300 focus:ring-red-500/20"
                  )}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Password (opcional) */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  Password <span className="ml-1 text-xs text-gray-400">(opcional)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formValues.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Deixe em branco para enviar email de primeiro acesso"
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                    errors.password && "border-red-300 focus:ring-red-500/20"
                  )}
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Se não definir uma password, será enviado um email para o utilizador criar a sua
                  password.
                </p>
              </div>

              {/* Atividade */}
              <div className="space-y-2">
                <Label
                  htmlFor="atividade"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  Atividade <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="atividade"
                  value={formValues.atividade}
                  onChange={(e) => handleChange("atividade", e.target.value)}
                  placeholder="Ex: Desenvolvedor, Designer, Gestor de Projetos"
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                    errors.atividade && "border-red-300 focus:ring-red-500/20"
                  )}
                />
                {errors.atividade && (
                  <p className="mt-1 text-xs text-red-500">{errors.atividade}</p>
                )}
              </div>

              {/* Data de Contratação */}
              <div className="space-y-2">
                <Label
                  htmlFor="contratacao"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  Data de contratação <span className="ml-1 text-red-500">*</span>
                </Label>
                <DatePicker
                  value={formValues.contratacao}
                  onChange={(date) => handleChange("contratacao", date || new Date())}
                  placeholder="Selecione a data"
                />
                {errors.contratacao && (
                  <p className="mt-1 text-xs text-red-500">{errors.contratacao}</p>
                )}
              </div>

              {/* Permissão */}
              <div className="space-y-2">
                <Label htmlFor="permissao" className="text-sm font-medium text-gray-700">
                  Permissão
                </Label>
                <Select
                  value={formValues.permissao}
                  onValueChange={(value) => handleChange("permissao", value as Permissao)}
                >
                  <SelectTrigger
                    id="permissao"
                    className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                  >
                    <SelectValue placeholder="Selecione uma permissão" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 bg-white/90 shadow-lg backdrop-blur-md">
                    <div className="p-2">
                      <div className="mb-2 space-y-1">
                        <p className="text-xs font-medium text-gray-500">
                          Selecione o nível de acesso
                        </p>
                      </div>
                      <div className="space-y-1">
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
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Regime */}
              <div className="space-y-2">
                <Label htmlFor="regime" className="text-sm font-medium text-gray-700">
                  Regime
                </Label>
                <Select
                  value={formValues.regime}
                  onValueChange={(value) => handleChange("regime", value as Regime)}
                >
                  <SelectTrigger
                    id="regime"
                    className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                  >
                    <SelectValue placeholder="Selecione um regime" />
                  </SelectTrigger>
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
              </div>
            </div>
            {/* Informação campos obrigatórios */}
            <div className="mt-4 flex items-center gap-1 px-1 text-xs text-gray-500">
              <span className="text-red-500">*</span> Campos obrigatórios
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
                  Criar utilizador
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
