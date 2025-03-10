"use client";

import { Calendar, Clock, BarChart3, AlertTriangle, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";

const nextDeliveries = [
  { project: "INOVC+", deliverable: "Relatório de Requisitos", deadline: "25 Apr 2024", status: "Em progresso" },
  { project: "DreamFAB", deliverable: "Protótipo UI", deadline: "28 Apr 2024", status: "Pendente" },
  { project: "IAMFat", deliverable: "Documentação API", deadline: "30 Apr 2024", status: "Em revisão" },
];

const overallProjectStatus = { totalProjects: 10, onTrack: 6, atRisk: 2, completed: 2 };
const resourceAllocationSummary = { totalResources: 20, availableResources: 8, overAllocatedResources: 3 };

export default function Page() {
  const weeklyOccupation = 75;
  const availableResources = [
    { name: "João Silva", occupation: 25 },
    { name: "Maria Santos", occupation: 30 },
    { name: "Ana Pereira", occupation: 70 },
    { name: "Rui Costa", occupation: 90 },
  ];

  const getStatusColor = (occupation: number) => {
    if (occupation < 50) return "text-green-500";
    if (occupation < 80) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-8xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Painel de Controlo</h1>
            <p className="text-sm text-gray-500">Bem-vindo de volta, Vasco Fernandes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Pesquisar..."
                className="w-64 pl-10 pr-4 py-2 rounded-full border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-200"
              />
            </div>
        
            <NovoProjeto />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ocupação Semanal</p>
                <p className="text-2xl font-semibold text-gray-900">{weeklyOccupation}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-blue-50">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Projetos Ativos</p>
                <p className="text-2xl font-semibold text-gray-900">4</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Próxima Entrega</p>
                <p className="text-2xl font-semibold text-gray-900">2 dias</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tarefas Pendentes</p>
                <p className="text-2xl font-semibold text-gray-900">7</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project and Resource Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Visão Geral dos Projetos</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-semibold text-gray-900">{overallProjectStatus.totalProjects}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Em Dia</p>
                  <p className="text-xl font-semibold text-green-500">{overallProjectStatus.onTrack}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Em Risco</p>
                  <p className="text-xl font-semibold text-yellow-500">{overallProjectStatus.atRisk}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Concluídos</p>
                  <p className="text-xl font-semibold text-blue-500">{overallProjectStatus.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Alocação de Recursos</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-semibold text-gray-900">{resourceAllocationSummary.totalResources}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Disponíveis</p>
                  <p className="text-xl font-semibold text-green-500">{resourceAllocationSummary.availableResources}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sobrealocados</p>
                  <p className="text-xl font-semibold text-red-500">{resourceAllocationSummary.overAllocatedResources}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources and Deliveries */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Recursos Mais Disponíveis</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {availableResources.map((resource) => (
                <div key={resource.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-blue-100">
                      <AvatarFallback className="text-sm font-medium text-gray-600">
                        {resource.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{resource.name}</p>
                      <p className="text-xs text-gray-500">Ocupação: {resource.occupation}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={resource.occupation} className="w-24 h-1 bg-gray-200" />
                    <span className={cn("text-sm font-semibold", getStatusColor(resource.occupation))}>
                      {resource.occupation}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg rounded-2xl bg-white">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Próximas Entregas</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {nextDeliveries.map((delivery) => (
                <div
                  key={`${delivery.project}-${delivery.deliverable}`}
                  className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{delivery.project}</p>
                  <p className="text-xs text-gray-500">
                    {delivery.deliverable} - {delivery.deadline}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-2 text-xs",
                      delivery.status === "Em progresso" && "bg-yellow-50 text-yellow-600 border-yellow-200",
                      delivery.status === "Pendente" && "bg-gray-50 text-gray-600 border-gray-200",
                      delivery.status === "Em revisão" && "bg-blue-50 text-blue-600 border-blue-200"
                    )}
                  >
                    {delivery.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
