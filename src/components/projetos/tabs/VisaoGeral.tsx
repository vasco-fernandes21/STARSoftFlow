"use client";

import { useMemo } from 'react';
import { Calendar, DollarSign, Percent, Info, Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { User as PrismaUser, Workpackage, AlocacaoRecurso } from "@prisma/client";
import { ProjetoEstado } from "@prisma/client";

interface RecursoComUser extends AlocacaoRecurso {
  user: Pick<PrismaUser, 'id' | 'name' | 'foto'> | null;
}

interface WPComRecursos extends Workpackage {
  recursos: RecursoComUser[];
}

interface ProjetoVisaoGeral {
  id: string;
  nome: string;
  descricao: string | null;
  inicio: Date | null;
  fim: Date | null;
  estado: ProjetoEstado;
  valor_eti: string | null;
  taxa_financiamento: string | null;
  overhead: string | null;
  financiamento?: { nome?: string | null } | null;
  workpackages: WPComRecursos[];
}

interface VisaoGeralProps {
  projeto: ProjetoVisaoGeral | null | undefined;
}

const formatarData = (data: Date | string | null | undefined): string => {
  if (!data) return "Não definida";
  try {
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Data inválida";
  }
};

const formatCurrency = (value: string | number | null | undefined): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof numValue !== 'number' || isNaN(numValue)) return "- €";
  return numValue.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatPercentage = (value: string | number | null | undefined): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof numValue !== 'number' || isNaN(numValue)) return "- %";
  const decimalValue = numValue;
  return decimalValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
};

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  iconClassName?: string;
}

function InfoItem({ icon: Icon, label, value, iconClassName }: InfoItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <Icon className={cn("h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5", iconClassName)} />
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{value || <span className="italic text-slate-400 font-normal">Não definido</span>}</p>
      </div>
    </div>
  );
}

interface ResourceUser extends Pick<PrismaUser, 'id' | 'name' | 'foto'> {
  name: string;
}

interface ResourceListProps {
  users: ResourceUser[];
}

function ResourceList({ users }: ResourceListProps) {
  if (!users || users.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Users className="h-5 w-5 flex-shrink-0 text-slate-400" />
          Recursos Envolvidos
        </p>
        <p className="text-sm text-slate-400 italic">Nenhum recurso alocado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <Users className="h-5 w-5 flex-shrink-0 text-slate-400" />
        Recursos Envolvidos ({users.length})
      </p>
      <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50/50 px-2 py-1 rounded">
            <User className="h-3.5 w-3.5 text-slate-500 flex-shrink-0"/>
            <span>{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VisaoGeral({ projeto }: VisaoGeralProps) {
  // Calculate involved users only once, memoizing the result based on workpackages
  const involvedUsers = useMemo(() => {
    // Ensure projeto and workpackages exist before processing
    if (!projeto || !projeto.workpackages) return []; // Check added here

    const userMap = new Map<string, ResourceUser>();
    projeto.workpackages.forEach(wp => {
      // Ensure wp.recursos is an array before iterating
      (wp.recursos ?? []).forEach(r => {
        // Check if user exists, has an id, and a name, and is not already in the map
        if (r.user && r.user.id && r.user.name && !userMap.has(r.user.id)) {
          userMap.set(r.user.id, {
            id: r.user.id,
            name: r.user.name, // name is guaranteed by the check above
            foto: r.user.foto // foto can be null
          });
        }
      });
    });
    // Convert the map values (unique users) to an array
    return Array.from(userMap.values());
  }, [projeto]); // Dependency array ensures recalculation only if projeto object changes

  // If projeto data is not available, show a message and return early
  if (!projeto) { // useMemo is now before this check
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6 text-center text-amber-700">
          <p className="font-semibold">Dados do projeto não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const getBadgeClass = (estado: ProjetoEstado) => {
    if (estado === ProjetoEstado.EM_DESENVOLVIMENTO) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (estado === ProjetoEstado.CONCLUIDO) return 'border-blue-200 bg-blue-50 text-blue-700';
    return 'border-amber-200 bg-amber-50 text-amber-700';
  };

  const getBadgeLabel = (estado: ProjetoEstado) => {
    if (estado === ProjetoEstado.EM_DESENVOLVIMENTO) return 'Em Desenvolvimento';
    if (estado === ProjetoEstado.CONCLUIDO) return 'Concluído';
    if (estado === ProjetoEstado.PENDENTE) return 'Pendente';
    if (estado === ProjetoEstado.RASCUNHO) return 'Rascunho';
    if (estado === ProjetoEstado.APROVADO) return 'Aprovado';
    return estado;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex-1 min-w-0 break-words">{projeto.nome}</h1>
            <Badge
              variant="outline"
              className={cn("px-3 py-1 text-sm font-semibold shadow-sm w-fit sm:w-auto flex-shrink-0", getBadgeClass(projeto.estado))}
            >
              {getBadgeLabel(projeto.estado)}
            </Badge>
          </div>
          {projeto.descricao ? (
            <p className="text-sm text-slate-600 max-w-prose">{projeto.descricao}</p>
           ) : (
            <p className="text-sm text-slate-400 italic">Sem descrição disponível.</p>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm space-y-5">
            <InfoItem icon={Calendar} label="Data de Início" value={formatarData(projeto.inicio)} />
            <InfoItem icon={Calendar} label="Data de Fim" value={formatarData(projeto.fim)} />
          </div>

          <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm space-y-5">
             <InfoItem icon={Info} label="Tipo de Financiamento" value={projeto.financiamento?.nome || 'N/A'}/>
            <InfoItem icon={DollarSign} label="Valor ETI" value={formatCurrency(projeto.valor_eti)} />
            <InfoItem icon={Percent} label="Taxa de Financiamento" value={formatPercentage(projeto.taxa_financiamento)} />
            <InfoItem icon={Percent} label="Overhead" value={formatPercentage(projeto.overhead)} />
          </div>

           <div className="p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm md:col-span-2 lg:col-span-1">
             <ResourceList users={involvedUsers} />
           </div>
      </div>
    </div>
  );
} 