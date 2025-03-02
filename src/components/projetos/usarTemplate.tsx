"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {  
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  EuroIcon,
  Plus,
  Trash,
  ListTodo,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

interface WorkPackage {
  id: string;
  name: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  description: string;
  hasDeliverable: boolean;
  deliverableDescription?: string;
  resources: string[];
  allocations?: {
    [resourceName: string]: {
      [monthIndex: number]: number;
    };
  };
}

const fundingTemplates = [
  {
    id: "pt2030",
    name: "Portugal 2030",
    icon: EuroIcon,
    description: "Programas de financiamento do quadro Portugal 2030.",
    color: "azul",
  },
  {
    id: "horizon",
    name: "Horizonte Europa",
    icon: EuroIcon,
    description: "Programa-quadro de investigação e inovação da UE.",
    color: "green-500",
  },
  {
    id: "norte2030",
    name: "Norte 2030",
    icon: EuroIcon,
    description: "Programa Operacional Regional do Norte 2030.",
    color: "red-500",
  },
];

const availableResources = [
  "João Silva",
  "Maria Santos",
  "Pedro Costa",
  "Ana Pereira",
  "Rui Almeida",
];

interface ProjectTemplateWizardProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ResourceAllocation {
  name: string;
  role: string;
  allocation: number[];
}

export function UsarTemplate({ onClose, onSubmit }: ProjectTemplateWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
  });
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [selectedResource, setSelectedResource] = useState("");
  const [selectedYear, setSelectedYear] = useState(2024);

  const addWorkPackage = () => {
    setWorkPackages([
      ...workPackages,
      {
        id: Date.now().toString(),
        name: "",
        tasks: [],
      },
    ]);
  };

  const removeWorkPackage = (wpId: string) => {
    setWorkPackages(workPackages.filter((wp) => wp.id !== wpId));
  };

  const updateWorkPackage = (wpId: string, field: string, value: any) => {
    setWorkPackages(
      workPackages.map((wp) =>
        wp.id === wpId ? { ...wp, [field]: value } : wp
      )
    );
  };

  const addTask = (wpId: string) => {
    setWorkPackages(
      workPackages.map((wp) =>
        wp.id === wpId
          ? {
              ...wp,
              tasks: [
                ...wp.tasks,
                {
                  id: Date.now().toString(),
                  name: "",
                  description: "",
                  hasDeliverable: false,
                  resources: [],
                },
              ],
            }
          : wp
      )
    );
  };

  const removeTask = (wpId: string, taskId: string) => {
    setWorkPackages(
      workPackages.map((wp) =>
        wp.id === wpId
          ? {
              ...wp,
              tasks: wp.tasks.filter((task) => task.id !== taskId),
            }
          : wp
      )
    );
  };

  const updateTask = (
    wpId: string,
    taskId: string,
    field: string,
    value: any
  ) => {
    setWorkPackages(
      workPackages.map((wp) =>
        wp.id === wpId
          ? {
              ...wp,
              tasks: wp.tasks.map((task) =>
                task.id === taskId ? { ...task, [field]: value } : task
              ),
            }
          : wp
      )
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const handleNext = () => {
    if (step === 1 && !selectedTemplate) return;
    if (step === 4) {
      onSubmit({
        ...formData,
        template: selectedTemplate,
        workPackages,
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      onClose();
      return;
    }
    setStep(step - 1);
  };

  const addResourceToTask = (wpId: string, taskId: string) => {
    if (!selectedResource) return;
    
    const resource = availableResources.find(r => r === selectedResource);
    if (!resource) return;

    setWorkPackages(prev =>
      prev.map(wp =>
        wp.id === wpId
          ? {
              ...wp,
              tasks: wp.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      resources: [...task.resources, resource]
                    }
                  : task
              )
            }
          : wp
      )
    );
    setSelectedResource("");
  };

  const removeResourceFromTask = (wpId: string, taskId: string, resourceName: string) => {
    setWorkPackages(prev =>
      prev.map(wp =>
        wp.id === wpId
          ? {
              ...wp,
              tasks: wp.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      resources: task.resources.filter(r => r !== resourceName)
                    }
                  : task
              )
            }
          : wp
      )
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fundingTemplates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border border-gray-200",
                  selectedTemplate === template.id &&
                    "ring-2 ring-azul shadow-md"
                )}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <template.icon className={cn("w-8 h-8", `text-${template.color}`)} />
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-6">
              <div className="grid gap-4">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nome do Projeto
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                  placeholder="Ex: INOVC+"
                />
              </div>
              <div className="grid gap-4">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="min-h-[120px] border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                  placeholder="Descreva o objetivo do projeto..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-4">
                  <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                    Data de Início
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                  />
                </div>
                <div className="grid gap-4">
                  <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                    Data de Fim
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                  />
                </div>
              </div>
              <div className="grid gap-4">
                <Label htmlFor="budget" className="text-sm font-medium text-gray-700">
                  Orçamento (€)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  className="border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                  placeholder="Ex: 50000"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Pacotes de Trabalho</h3>
              <Button
                onClick={addWorkPackage}
                variant="outline"
                size="sm"
                className="rounded-md border-gray-200 text-azul hover:bg-azul/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Pacote
              </Button>
            </div>
            <div className="space-y-6">
              {workPackages.map((wp) => (
                <Card
                  key={wp.id}
                  className="relative border border-gray-200 shadow-md rounded-xl hover:shadow-lg transition-shadow"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 text-red-500 hover:text-red-700"
                    onClick={() => removeWorkPackage(wp.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid gap-4">
                      <Label className="text-sm font-medium text-gray-700">
                        Nome do Pacote de Trabalho
                      </Label>
                      <Input
                        value={wp.name}
                        onChange={(e) =>
                          updateWorkPackage(wp.id, "name", e.target.value)
                        }
                        placeholder="Ex: WP1 - Análise de Requisitos"
                        className="border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-gray-900">Tarefas</h4>
                      <Button
                        onClick={() => addTask(wp.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-md border-gray-200 text-azul hover:bg-azul/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Tarefa
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {wp.tasks.map((task) => (
                        <Card
                          key={task.id}
                          className="border border-gray-200 shadow-md rounded-xl hover:shadow-lg transition-shadow"
                        >
                          <CardContent className="p-6 relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-4 top-4 text-red-500 hover:text-red-700"
                              onClick={() => removeTask(wp.id, task.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                            <div className="space-y-6">
                              <div className="grid gap-4">
                                <Label className="text-sm font-medium text-gray-700">
                                  Nome da Tarefa
                                </Label>
                                <Input
                                  value={task.name}
                                  onChange={(e) =>
                                    updateTask(wp.id, task.id, "name", e.target.value)
                                  }
                                  placeholder="Ex: Levantamento de requisitos"
                                  className="border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                                />
                              </div>
                              <div className="grid gap-4">
                                <Label className="text-sm font-medium text-gray-700">
                                  Descrição
                                </Label>
                                <Textarea
                                  value={task.description}
                                  onChange={(e) =>
                                    updateTask(wp.id, task.id, "description", e.target.value)
                                  }
                                  className="min-h-[120px] border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                                  placeholder="Descreva a tarefa..."
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`deliverable-${task.id}`}
                                  checked={task.hasDeliverable}
                                  onCheckedChange={(checked) =>
                                    updateTask(wp.id, task.id, "hasDeliverable", checked)
                                  }
                                  className="border-gray-300"
                                />
                                <Label
                                  htmlFor={`deliverable-${task.id}`}
                                  className="text-sm text-gray-700"
                                >
                                  Requer entregável
                                </Label>
                              </div>
                              {task.hasDeliverable && (
                                <div className="grid gap-4">
                                  <Label className="text-sm font-medium text-gray-700">
                                    Descrição do Entregável
                                  </Label>
                                  <Textarea
                                    value={task.deliverableDescription}
                                    onChange={(e) =>
                                      updateTask(
                                        wp.id,
                                        task.id,
                                        "deliverableDescription",
                                        e.target.value
                                      )
                                    }
                                    className="min-h-[120px] border border-gray-200 rounded-md p-3 text-gray-900 focus:ring-azul/50"
                                    placeholder="Descreva o entregável..."
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Recursos e Alocação</h3>
            {workPackages.map((wp) => (
              <Card key={wp.id} className="border border-gray-200 shadow-md rounded-xl">
                <div className="p-6 space-y-6">
                  <h4 className="font-semibold text-gray-900">{wp.name}</h4>
                  
                  {wp.tasks.map((task) => (
                    <div key={task.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-gray-700">{task.name}</h5>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedResource}
                            onValueChange={setSelectedResource}
                          >
                            <SelectTrigger className="w-[280px]">
                              <SelectValue placeholder="Selecionar recurso" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableResources
                                .filter(r => !task.resources.includes(r))
                                .map((resource) => (
                                  <SelectItem key={resource} value={resource}>
                                    {resource}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addResourceToTask(wp.id, task.id)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar
                          </Button>
                        </div>
                      </div>

                      {/* Resources List */}
                      {task.resources.length > 0 && (
                        <Card className="border-gray-100">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {task.resources.map((resource) => (
                                <TableRow key={resource}>
                                  <TableCell>{resource}</TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeResourceFromTask(wp.id, task.id, resource)}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Card>
                      )}

                      {/* Resource Allocation */}
                      {task.resources.length > 0 && (
                        <div className="space-y-6 pt-4">
                          <div className="flex items-center justify-between">
                            <h6 className="text-sm font-medium text-gray-700">Alocação Mensal</h6>
                            <Select
                              value={selectedYear.toString()}
                              onValueChange={(value) => setSelectedYear(Number(value))}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Ano" />
                              </SelectTrigger>
                              <SelectContent>
                                {years.map((year) => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {task.resources.map((resource, resourceIndex) => (
                            <div key={resource} className="space-y-2 bg-gray-50/50 p-4 rounded-lg">
                              <p className="text-sm font-medium text-gray-700">{resource}</p>
                              <div className="grid grid-cols-6 gap-4">
                                {months.slice(0, 6).map((month, monthIndex) => (
                                  <div key={monthIndex} className="space-y-1">
                                    <Label className="text-xs text-gray-500">{month}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      className="text-right h-8 text-sm"
                                      onChange={(e) => handleAllocationChange(wp.id, task.id, resourceIndex, monthIndex, e.target.value)}
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-6 gap-4">
                                {months.slice(6).map((month, monthIndex) => (
                                  <div key={monthIndex} className="space-y-1">
                                    <Label className="text-xs text-gray-500">{month}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      className="text-right h-8 text-sm"
                                      onChange={(e) => handleAllocationChange(wp.id, task.id, resourceIndex, monthIndex + 6, e.target.value)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const handleAllocationChange = (wpId: string, taskId: string, resourceIndex: number, monthIndex: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) return;
  
    setWorkPackages(prev =>
      prev.map(wp =>
        wp.id === wpId
          ? {
              ...wp,
              tasks: wp.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      allocations: {
                        ...task.allocations,
                        [task.resources[resourceIndex] || '']: {
                          ...(task.allocations?.[task.resources[resourceIndex] || ''] || {}),
                          [monthIndex.toString()]: numValue
                        }
                      }
                    }
                  : task
              )
            }
          : wp
      )
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-none shadow-lg rounded-2xl bg-white">
      <CardHeader className="p-6 border-b border-gray-100">
        <CardTitle className="text-2xl font-semibold text-gray-900">
          {step === 1 && "Tipo de Financiamento"}
          {step === 2 && "Informações Básicas"}
          {step === 3 && "Estrutura do Projeto"}
          {step === 4 && "Recursos e Alocação"}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          {step === 1 && "Selecione o tipo de financiamento do projeto"}
          {step === 2 && "Preencha as informações básicas do projeto"}
          {step === 3 && "Defina os pacotes de trabalho e tarefas"}
          {step === 4 && "Atribua recursos às tarefas e defina suas alocações"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {renderStep()}
      </CardContent>
      <CardFooter className="p-6 border-t border-gray-100 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          className="rounded-md border-gray-200 text-gray-600 hover:bg-gray-100"
        >
          {step === 1 ? "Cancelar" : "Voltar"}
        </Button>
        <Button
          onClick={handleNext}
          className="rounded-md bg-azul text-white hover:bg-azul/90 shadow-sm"
        >
          {step === 4 ? "Criar Projeto" : "Próximo"}
        </Button>
      </CardFooter>
    </Card>
  );
}
