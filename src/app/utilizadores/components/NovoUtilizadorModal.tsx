import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api as trpcApi } from "@/trpc/react";

type Permissao = "ADMIN" | "GESTOR" | "COMUM";
type Regime = "PARCIAL" | "INTEGRAL";

export function NovoUtilizadorModal() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Estado inicial com tipagem explícita
  const [formValues, setFormValues] = useState<{
    name: string;
    informacoes: string;
    username: string;
    email: string;
    atividade: string;
    contratacao: Date;
    contratado: boolean;
    permissao: Permissao;
    regime: Regime;
    password: string;
    salario: number | undefined;
  }>({
    name: "",
    informacoes: "",
    username: "",
    email: "",
    atividade: "",
    contratacao: new Date(),
    contratado: false,
    permissao: "COMUM" as Permissao,
    regime: "INTEGRAL" as Regime,
    password: "",
    salario: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = trpcApi.useUtils();

  const createUserMutation = api.utilizador.create.useMutation({
    onSuccess: () => {
      toast.success("Utilizador criado com sucesso");
      utils.utilizador.findAll.invalidate();
      resetFormAndClose();
    },
    onError: (error) => {
      setIsSubmitting(false);
      // Se for um erro de conflito (email duplicado), mostra a mensagem específica
      if (error.data?.code === "CONFLICT") {
        toast.error(error.message, {
          description: "Por favor, utilize um email diferente ou contacte o administrador.",
        });
        // Marca o campo de email com erro
        setErrors(prev => ({
          ...prev,
          email: error.message
        }));
      } else {
        toast.error("Erro ao criar utilizador", {
          description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        });
      }
    },
  });

  const resetFormAndClose = () => {
    setFormValues({
      name: "",
      informacoes: "",
      username: "",
      email: "",
      atividade: "",
      contratacao: new Date(),
      contratado: false,
      permissao: "COMUM",
      regime: "INTEGRAL",
      password: "",
      salario: undefined,
    });
    setErrors({});
    setIsSubmitting(false);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    if (formValues.contratado) {
      if (!formValues.name?.trim()) {
        setErrors({ name: "Nome é obrigatório" });
        setIsSubmitting(false);
        return;
      }
      createUserMutation.mutate({
        name: formValues.name,
        informacoes: formValues.informacoes,
        contratado: true,
        salario: formValues.salario,
      });
    } else {
      const newErrors: Record<string, string> = {};
      if (!formValues.name?.trim()) newErrors.name = "Nome é obrigatório";
      if (!formValues.username?.trim()) newErrors.username = "Username obrigatório";
      if (!formValues.email?.trim()) newErrors.email = "Email obrigatório";
      if (!formValues.atividade?.trim()) newErrors.atividade = "Atividade obrigatória";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }
      createUserMutation.mutate({
        name: formValues.name,
        username: formValues.username,
        email: formValues.email,
        atividade: formValues.atividade,
        contratacao: formValues.contratacao instanceof Date ? formValues.contratacao.toISOString() : formValues.contratacao,
        permissao: formValues.permissao,
        regime: formValues.regime,
        password: formValues.password || undefined,
        contratado: false,
        salario: formValues.salario,
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
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Campos principais */}
              {formValues.contratado ? (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="name"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Identificação <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formValues.name}
                      onChange={(e) => setFormValues((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Identificação do contratado"
                      className={cn(
                        "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                        errors.name && "border-red-300 focus:ring-red-500/20"
                      )}
                      required
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label
                      htmlFor="informacoes"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Descrição
                    </Label>
                    <Input
                      id="informacoes"
                      value={formValues.informacoes}
                      onChange={(e) => setFormValues((f) => ({ ...f, informacoes: e.target.value }))}
                      placeholder="Descrição da contratação"
                      className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Nome <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formValues.name}
                      onChange={(e) => setFormValues((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nome completo"
                      className={cn(
                        "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                        errors.name && "border-red-300 focus:ring-red-500/20"
                      )}
                      required
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Username <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <Input
                      id="username"
                      value={formValues.username}
                      onChange={(e) => setFormValues((f) => ({ ...f, username: e.target.value }))}
                      placeholder="Username"
                      className={cn(
                        "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                        errors.username && "border-red-300 focus:ring-red-500/20"
                      )}
                      required
                    />
                    {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                  </div>
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
                      onChange={(e) => setFormValues((f) => ({ ...f, email: e.target.value }))}
                      placeholder="Email"
                      className={cn(
                        "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                        errors.email && "border-red-300 focus:ring-red-500/20"
                      )}
                      required
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>
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
                      onChange={(e) => setFormValues((f) => ({ ...f, atividade: e.target.value }))}
                      placeholder="Atividade"
                      className={cn(
                        "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                        errors.atividade && "border-red-300 focus:ring-red-500/20"
                      )}
                      required
                    />
                    {errors.atividade && <p className="mt-1 text-xs text-red-500">{errors.atividade}</p>}
                  </div>
                </>
              )}
              {/* Data de contratação + Salário: mostrar data só se NÃO for contratado */}
              <div className="space-y-2 md:col-span-2 flex flex-col md:flex-row md:items-end md:gap-4">
                {!formValues.contratado && (
                  <div className="flex-1">
                    <Label
                      htmlFor="contratacao"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Data de contratação
                    </Label>
                    <DatePicker
                      value={formValues.contratacao}
                      onChange={(date) => setFormValues((f) => ({ ...f, contratacao: date || new Date() }))}
                      placeholder="Selecione a data"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Label
                    htmlFor="salario"
                    className="flex items-center text-sm font-medium text-gray-700"
                  >
                    €/Mês
                  </Label>
                  <Input
                    id="salario"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formValues.salario ?? ""}
                    onChange={e => setFormValues(f => ({ ...f, salario: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Ex: 1500"
                    className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                  />
                </div>
              </div>
              {/* Checkbox do Shadcn para contratado, agora mais abaixo, antes das permissões/regime */}
              <div className="flex items-center gap-3 md:col-span-2 mt-2">
                <Checkbox
                  id="contratado"
                  checked={formValues.contratado}
                  onCheckedChange={(checked) => setFormValues((f) => ({ ...f, contratado: !!checked }))}
                  className="data-[state=checked]:bg-azul border-azul focus:ring-azul/20"
                />
                <Label htmlFor="contratado" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                  Contratado
                </Label>
              </div>
              {/* Bloco de permissões/regime */}
              {!formValues.contratado && (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="permissao"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Permissão
                    </Label>
                    <Select
                      value={formValues.permissao}
                      onValueChange={(value) => setFormValues((f) => ({ ...f, permissao: value as Permissao }))}
                    >
                      <SelectTrigger
                        id="permissao"
                        className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                      >
                        <SelectValue placeholder="Selecione uma permissão" />
                      </SelectTrigger>
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
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="regime"
                      className="flex items-center text-sm font-medium text-gray-700"
                    >
                      Regime
                    </Label>
                    <Select
                      value={formValues.regime}
                      onValueChange={(value) => setFormValues((f) => ({ ...f, regime: value as Regime }))}
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
                </>
              )}
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
