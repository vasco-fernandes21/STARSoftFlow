import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Edit, Trash, Clock, Package, FileText, ChevronDown, X, Save } from "lucide-react";
import { AlocacaoRecurso, Entregavel, Material, Prisma, Tarefa, type Rubrica } from "@prisma/client";
import { Decimal } from "decimal.js";
import { WorkpackageForm } from "./WorkpackageForm";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjetoForm } from "../../ProjetoFormContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useConfirmacao } from "@/providers/PopupConfirmacaoProvider";

// Define o tipo corretamente
type WorkpackageWithRelations = Omit<Prisma.WorkpackageGetPayload<{
  include: {
    tarefas: {
      include: {
        entregaveis: true
      }
    }
    materiais: true
    recursos: true
  }
}>, "projeto"> & {
  projetoId: string;
  tarefas: Array<Omit<Prisma.TarefaGetPayload<{ include: { entregaveis: true } }>, "workpackage">>;
  materiais: Array<Omit<Prisma.MaterialGetPayload<{}>, "workpackage">>;
  recursos: Array<Omit<Prisma.AlocacaoRecursoGetPayload<{}>, "workpackage" | "user">>;
};

type TarefaWithRelations = Prisma.TarefaGetPayload<{
  include: {
    entregaveis: true
  }
}>;

interface WorkpackageItemProps {
  workpackage: WorkpackageWithRelations;
  onEdit: (wp: WorkpackageWithRelations) => void;
  onDelete: (id: string) => void;
  handlers: {
    addTarefa: (workpackageId: string, tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">) => void;
    removeTarefa: (workpackageId: string, tarefaId: string) => void;
    addMaterial: (workpackageId: string, material: Omit<Prisma.MaterialCreateInput, "workpackage">) => void;
    removeMaterial: (workpackageId: string, materialId: number) => void;
    addEntregavel: (workpackageId: string, tarefaId: string, entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">) => void;
    removeEntregavel: (workpackageId: string, tarefaId: string, entregavelId: string) => void;
  };
}

interface TarefaFormProps {
  workpackageId: string;
  onSubmit: (workpackageId: string, tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">) => void;
  onCancel: () => void;
  initialData?: Partial<Prisma.TarefaGetPayload<{
    include: {
      entregaveis: true
    }
  }>>;
}

interface MaterialFormProps {
  workpackageId: string;
  onSubmit: (workpackageId: string, material: Omit<Prisma.MaterialCreateInput, "workpackage">) => void;
  onCancel: () => void;
}

interface EntregavelFormProps {
  tarefaId: string;
  onSubmit: (tarefaId: string, entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">) => void;
  onCancel: () => void;
}

interface TarefaItemProps {
  tarefa: Prisma.TarefaGetPayload<{
    include: {
      entregaveis: true
    }
  }>;
  workpackageId: string;
  handlers: {
    addEntregavel: (workpackageId: string, tarefaId: string, entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">) => void;
    removeEntregavel: (workpackageId: string, tarefaId: string, entregavelId: string) => void;
    removeTarefa: (workpackageId: string, tarefaId: string) => void;
  };
}

interface WorkpackageDetailsProps {
  workpackage: WorkpackageWithRelations;
  handlers: WorkpackageItemProps["handlers"];
}

function WorkpackageItem({ workpackage, onEdit, onDelete, handlers }: WorkpackageItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mb-3 border border-azul/10 hover:border-azul/20 transition-all w-full shadow-sm">
      <CardHeader className="py-3 px-4">
        <div className="flex justify-between items-center w-full">
          <div 
            className="cursor-pointer flex-1 flex items-center gap-3" 
            onClick={() => setExpanded(!expanded)}
          >
            <div className={`h-9 w-9 rounded-xl ${expanded ? 'bg-azul text-white' : 'bg-azul/10 text-azul'} flex items-center justify-center transition-all`}>
              <Briefcase className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium text-azul flex items-center">
                {workpackage.nome}
              </CardTitle>
              {workpackage.inicio && workpackage.fim && (
                <CardDescription className="text-xs text-azul/60 mt-1">
                  {new Date(workpackage.inicio).toLocaleDateString('pt-PT')} - {new Date(workpackage.fim).toLocaleDateString('pt-PT')}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center ${expanded ? 'bg-azul/10 rotate-180' : 'bg-gray-100'} transition-all duration-200`}>
              <ChevronDown className="h-4 w-4 text-azul/60" />
            </div>
            
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(workpackage);
                }}
              >
                <Edit className="h-3.5 w-3.5 text-azul/60" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workpackage.id);
                }}
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`py-2 px-4 ${expanded ? '' : 'pb-3'}`}>
        {workpackage.descricao && (
          <p className="text-xs text-azul/70 mb-2">{workpackage.descricao.toString()}</p>
        )}
        <div className="flex gap-2">
          {workpackage.tarefas?.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-azul/5 px-2 py-0.5">
              {workpackage.tarefas.length} tarefa(s)
            </Badge>
          )}
          {workpackage.materiais?.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-azul/5 px-2 py-0.5">
              {workpackage.materiais.length} material(is)
            </Badge>
          )}
          {workpackage.recursos?.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-azul/5 px-2 py-0.5">
              {workpackage.recursos.length} alocação(ões)
            </Badge>
          )}
        </div>

        {/* Detalhes expandidos */}
        {expanded && (
          <WorkpackageDetails workpackage={workpackage} handlers={handlers} />
        )}
      </CardContent>
    </Card>
  );
}

// Componentes adicionais para tarefas, materiais e entregáveis
function TarefaForm({ 
  workpackageId, 
  onSubmit, 
  onCancel, 
  initialData 
}: TarefaFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
    inicio: initialData?.inicio || undefined,
    fim: initialData?.fim || undefined,
    estado: initialData?.estado || false
  });

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome da tarefa é obrigatório");
      return;
    }

    onSubmit(workpackageId, {
      nome: formData.nome,
      descricao: formData.descricao || null,
      inicio: formData.inicio || null,
      fim: formData.fim || null,
      estado: formData.estado
    });
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <Clock className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">
          {initialData ? "Editar Tarefa" : "Nova Tarefa"}
        </h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="nome-tarefa" className="text-azul/80 text-sm">Nome da Tarefa</Label>
          <Input
            id="nome-tarefa"
            placeholder="Ex: Desenvolvimento de API"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="descricao-tarefa" className="text-azul/80 text-sm">Descrição</Label>
          <Textarea
            id="descricao-tarefa"
            placeholder="Descreva a tarefa..."
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="data-inicio-tarefa" className="text-azul/80 text-sm">Data de Início</Label>
            <DatePicker
              value={formData.inicio}
              onChange={(date) => setFormData({ ...formData, inicio: date })}
            />
          </div>
          <div>
            <Label htmlFor="data-fim-tarefa" className="text-azul/80 text-sm">Data de Conclusão</Label>
            <DatePicker
              value={formData.fim}
              onChange={(date) => setFormData({ ...formData, fim: date })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-azul/20 text-azul/70 hover:bg-azul/5"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MaterialForm({ 
  workpackageId, 
  onSubmit, 
  onCancel 
}: MaterialFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    quantidade: '',
    preco: '',
    ano_utilizacao: new Date().getFullYear().toString(),
    rubrica: 'MATERIAIS' as Rubrica
  });

  const handleSubmit = () => {
    if (!formData.nome || !formData.quantidade || !formData.preco) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    onSubmit(workpackageId, {
      nome: formData.nome,
      quantidade: Number(formData.quantidade),
      preco: Number(formData.preco.replace(',', '.')),
      ano_utilizacao: Number(formData.ano_utilizacao),
      rubrica: formData.rubrica
    });
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <Package className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">Novo Material</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="nome-material" className="text-azul/80 text-sm">Nome do Material</Label>
          <Input
            id="nome-material"
            placeholder="Ex: Computador Portátil"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="descricao-material" className="text-azul/80 text-sm">Descrição</Label>
          <Textarea
            id="descricao-material"
            placeholder="Descreva o material..."
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="quantidade-material" className="text-azul/80 text-sm">Quantidade</Label>
            <Input
              id="quantidade-material"
              type="number"
              min="1"
              placeholder="Ex: 2"
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="valor-material" className="text-azul/80 text-sm">Preço Unitário (€)</Label>
            <Input
              id="valor-material"
              placeholder="Ex: 1200,00"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ano-material" className="text-azul/80 text-sm">Ano de Utilização</Label>
            <Input
              id="ano-material"
              type="number"
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 10}
              placeholder={new Date().getFullYear().toString()}
              value={formData.ano_utilizacao}
              onChange={(e) => setFormData({ ...formData, ano_utilizacao: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rubrica-material" className="text-azul/80 text-sm">Rubrica</Label>
            <Select
              value={formData.rubrica}
              onValueChange={(value) => setFormData({ ...formData, rubrica: value as Rubrica })}
            >
              <SelectTrigger id="rubrica-material" className="mt-1">
                <SelectValue placeholder="Selecione a rubrica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MATERIAIS">Materiais</SelectItem>
                <SelectItem value="SERVICOS_TERCEIROS">Serviços de Terceiros</SelectItem>
                <SelectItem value="OUTROS_SERVICOS">Outros Serviços</SelectItem>
                <SelectItem value="DESLOCACAO_ESTADIAS">Deslocação e Estadias</SelectItem>
                <SelectItem value="OUTROS_CUSTOS">Outros Custos</SelectItem>
                <SelectItem value="CUSTOS_ESTRUTURA">Custos de Estrutura</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-azul/20 text-azul/70 hover:bg-azul/5"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EntregavelForm({ 
  tarefaId, 
  onSubmit, 
  onCancel 
}: EntregavelFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data: undefined as Date | undefined,
    anexo: ''
  });

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome do entregável é obrigatório");
      return;
    }

    onSubmit(tarefaId, {
      nome: formData.nome,
      descricao: formData.descricao || null,
      data: formData.data || null,
      anexo: formData.anexo || null
    });
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">Novo Entregável</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="nome-entregavel" className="text-azul/80 text-sm">Nome do Entregável</Label>
          <Input
            id="nome-entregavel"
            placeholder="Ex: Relatório Final"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="descricao-entregavel" className="text-azul/80 text-sm">Descrição</Label>
          <Textarea
            id="descricao-entregavel"
            placeholder="Descreva o entregável..."
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="data-entregavel" className="text-azul/80 text-sm">Data de Entrega</Label>
            <DatePicker
              value={formData.data}
              onChange={(date) => setFormData({ ...formData, data: date })}
            />
          </div>
          <div>
            <Label htmlFor="anexo-entregavel" className="text-azul/80 text-sm">Anexo (URL)</Label>
            <Input
              id="anexo-entregavel"
              placeholder="Ex: https://exemplo.com/documento.pdf"
              value={formData.anexo}
              onChange={(e) => setFormData({ ...formData, anexo: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-azul/20 text-azul/70 hover:bg-azul/5"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Atualização do componente para tarefas com expansão e melhor fluxo de entregáveis
function TarefaItem({ 
  tarefa, 
  workpackageId, 
  handlers 
}: TarefaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingEntregavel, setAddingEntregavel] = useState(false);

  return (
    <Card key={tarefa.id} className="p-3 border-azul/10 hover:border-azul/20 transition-all">
      <div 
        className="flex justify-between items-start cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2 flex-1">
          <div className={`h-7 w-7 rounded-lg ${expanded ? 'bg-azul text-white' : 'bg-azul/10 text-azul'} flex items-center justify-center mt-0.5 transition-all`}>
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <h5 className="text-sm font-medium text-azul">{tarefa.nome}</h5>
            {tarefa.inicio && tarefa.fim && (
              <p className="text-xs text-azul/60 mt-0.5">
                {new Date(tarefa.inicio).toLocaleDateString('pt-PT')} - {new Date(tarefa.fim).toLocaleDateString('pt-PT')}
              </p>
            )}
            {tarefa.descricao && !expanded && (
              <p className="text-xs text-azul/70 mt-1 line-clamp-1">{tarefa.descricao}</p>
            )}
          </div>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${expanded ? 'bg-azul/10 rotate-180' : 'bg-gray-100'} transition-all duration-200`}>
            <ChevronDown className="h-3 w-3 text-azul/60" />
          </div>
        </div>
        <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlers.removeTarefa(workpackageId, tarefa.id)}
            className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo expandido da tarefa */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-azul/10">
          {tarefa.descricao && (
            <p className="text-xs text-azul/70 mb-3">{tarefa.descricao}</p>
          )}
          
          {/* Seção de entregáveis */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h6 className="text-xs font-medium text-azul/70 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-azul/60" />
                Entregáveis
              </h6>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingEntregavel(true)}
                className="h-6 text-xs bg-white border-azul/20 hover:bg-azul/10 text-azul rounded-lg px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Formulário de entregável */}
            {addingEntregavel && (
              <EntregavelForm
                tarefaId={tarefa.id}
                onSubmit={(tarefaId, entregavel) => {
                  handlers.addEntregavel(workpackageId, tarefaId, entregavel);
                  setAddingEntregavel(false);
                  toast.success("Entregável adicionado com sucesso!");
                }}
                onCancel={() => setAddingEntregavel(false)}
              />
            )}

            {/* Lista de entregáveis */}
            {tarefa.entregaveis && tarefa.entregaveis.length > 0 ? (
              <div className="space-y-2 mt-2">
                {tarefa.entregaveis.map((entregavel: any) => (
                  <div 
                    key={entregavel.id} 
                    className="bg-azul/5 p-2 rounded-lg border border-azul/10 flex justify-between items-start"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-azul/70" />
                        <span className="text-xs font-medium text-azul">{entregavel.nome}</span>
                      </div>
                      {entregavel.descricao && (
                        <p className="text-xs text-azul/70 mt-1 ml-5">{entregavel.descricao}</p>
                      )}
                      {entregavel.data && (
                        <p className="text-xs text-azul/60 mt-1 ml-5">
                          Data: {new Date(entregavel.data).toLocaleDateString('pt-PT')}
                        </p>
                      )}
                      {entregavel.anexo && (
                        <a 
                          href={entregavel.anexo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-azul underline ml-5 mt-1 inline-block"
                        >
                          Ver anexo
                        </a>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlers.removeEntregavel(workpackageId, tarefa.id, entregavel.id)}
                      className="h-6 w-6 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 bg-white/50 rounded-lg border border-dashed border-azul/20">
                <p className="text-xs text-azul/60">Nenhum entregável adicionado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// Componente para exibir tarefas, materiais e entregáveis
function WorkpackageDetails({ 
  workpackage, 
  handlers 
}: WorkpackageDetailsProps) {
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);

  return (
    <div className="mt-4 space-y-6">
      {/* Tarefas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-azul flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-azul/60" />
            Tarefas
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingTarefa(true)}
            className="h-7 text-xs bg-white border-azul/20 hover:bg-azul/10 text-azul rounded-lg"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        {addingTarefa && (
          <TarefaForm
            workpackageId={workpackage.id}
            onSubmit={(workpackageId, tarefa) => {
              handlers.addTarefa(workpackageId, tarefa);
              setAddingTarefa(false);
              toast.success("Tarefa adicionada com sucesso!");
            }}
            onCancel={() => setAddingTarefa(false)}
          />
        )}

        {workpackage.tarefas && workpackage.tarefas.length > 0 ? (
          <div className="space-y-2">
            {workpackage.tarefas.map((tarefa: any) => (
              <TarefaItem 
                key={tarefa.id}
                tarefa={tarefa}
                workpackageId={workpackage.id}
                handlers={handlers}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-white/50 rounded-lg border border-dashed border-azul/20">
            <p className="text-sm text-azul/60">Nenhuma tarefa adicionada</p>
          </div>
        )}
      </div>

      {/* Materiais */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-azul flex items-center gap-1.5">
            <Package className="h-4 w-4 text-azul/60" />
            Materiais
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingMaterial(true)}
            className="h-7 text-xs bg-white border-azul/20 hover:bg-azul/10 text-azul rounded-lg"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        {addingMaterial && (
          <MaterialForm
            workpackageId={workpackage.id}
            onSubmit={(workpackageId, material) => {
              handlers.addMaterial(workpackageId, material);
              setAddingMaterial(false);
              toast.success("Material adicionado com sucesso!");
            }}
            onCancel={() => setAddingMaterial(false)}
          />
        )}

        {workpackage.materiais && workpackage.materiais.length > 0 ? (
          <div className="space-y-2">
            {workpackage.materiais.map((material: any) => (
              <Card key={material.id} className="p-3 border-azul/10 hover:border-azul/20 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center mt-0.5">
                      <Package className="h-3.5 w-3.5 text-azul" />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-azul">{material.nome}</h5>
                      <p className="text-xs text-azul/70 mt-0.5">
                        {material.quantidade} unid. x {Number(material.preco).toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR'
                        })} = {(material.quantidade * material.preco).toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR'
                        })}
                      </p>
                      {material.descricao && (
                        <p className="text-xs text-azul/70 mt-1">{material.descricao}</p>
                      )}
                      <p className="text-xs text-azul/60 mt-1">
                        Ano de utilização: {material.ano_utilizacao}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlers.removeMaterial(workpackage.id, material.id)}
                    className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-white/50 rounded-lg border border-dashed border-azul/20">
            <p className="text-sm text-azul/60">Nenhum material adicionado</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkpackageManager() {
  const { state, dispatch } = useProjetoForm();
  const [isAddingWP, setIsAddingWP] = useState(false);
  const [editingWP, setEditingWP] = useState<any>(null);
  const { confirmar } = useConfirmacao();

  // Handlers agrupados em um objeto
  const handlers = {
    // Workpackages
    addWorkpackage: (workpackage: Omit<Prisma.WorkpackageCreateInput, "projeto">) => {
      const newWorkpackage: WorkpackageWithRelations = {
        ...workpackage,
        id: crypto.randomUUID(),
        projetoId: crypto.randomUUID(),
        nome: workpackage.nome,
        descricao: workpackage.descricao || null,
        inicio: workpackage.inicio ? new Date(workpackage.inicio) : null,
        fim: workpackage.fim ? new Date(workpackage.fim) : null,
        estado: workpackage.estado || false,
        tarefas: [],
        materiais: [],
        recursos: []
      } satisfies WorkpackageWithRelations;

      dispatch({
        type: "UPDATE_PROJETO",
        data: {
          workpackages: [...state.workpackages, newWorkpackage]
        }
      });
      setIsAddingWP(false);
      toast.success("Workpackage adicionado com sucesso!");
    },

    updateWorkpackage: (id: string, data: Partial<Prisma.WorkpackageCreateInput>) => {
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === id
          ? {
              ...wp,
              ...data,
              descricao: data.descricao ?? wp.descricao,
              inicio: data.inicio ? new Date(data.inicio) : wp.inicio,
              fim: data.fim ? new Date(data.fim) : wp.fim,
              estado: data.estado ?? wp.estado,
              tarefas: wp.tarefas || [],
              materiais: wp.materiais || [],
              recursos: wp.recursos || []
            } as WorkpackageWithRelations
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeWorkpackage: async (id: string) => {
      const confirmado = await confirmar({
        titulo: "Remover workpackage",
        descricao: "Tem a certeza que deseja remover este workpackage? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.",
        tipo: "erro",
        labelConfirmar: "Remover",
        labelCancelar: "Cancelar",
        destrutivo: true
      });

      if (confirmado) {
        dispatch({
          type: "UPDATE_PROJETO",
          data: {
            workpackages: state.workpackages.filter(wp => wp.id !== id)
          }
        });
        toast.success("Workpackage removido com sucesso!");
      }
    },

    // Tarefas
    addTarefa: (workpackageId: string, tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">) => {
      const newTarefa: Prisma.TarefaGetPayload<{
        include: { entregaveis: true }
      }> = {
        ...tarefa,
        id: crypto.randomUUID(),
        workpackageId: workpackageId,
        descricao: tarefa.descricao || null,
        inicio: tarefa.inicio ? new Date(tarefa.inicio) : null,
        fim: tarefa.fim ? new Date(tarefa.fim) : null,
        estado: tarefa.estado || false,
        entregaveis: []
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: [...wp.tarefas, newTarefa]
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeTarefa: async (workpackageId: string, tarefaId: string) => {
      const confirmado = await confirmar({
        titulo: "Remover tarefa",
        descricao: "Tem a certeza que deseja remover esta tarefa? Esta ação não pode ser desfeita e todos os entregáveis associados serão perdidos.",
        tipo: "erro",
        labelConfirmar: "Remover",
        labelCancelar: "Cancelar",
        destrutivo: true
      });

      if (confirmado) {
        const updatedWorkpackages = state.workpackages.map(wp =>
          wp.id === workpackageId
            ? {
                ...wp,
                tarefas: wp.tarefas.filter(t => t.id !== tarefaId)
              }
            : wp
        );

        dispatch({
          type: "UPDATE_PROJETO",
          data: { workpackages: updatedWorkpackages }
        });
        toast.success("Tarefa removida com sucesso!");
      }
    },

    // Materiais
    addMaterial: (workpackageId: string, material: Omit<Prisma.MaterialCreateInput, "workpackage">) => {
      const newMaterial = {
        ...material,
        id: Date.now(),
        workpackageId: workpackageId,
        preco: new Decimal(material.preco.toString()),
        quantidade: Number(material.quantidade),
        ano_utilizacao: Number(material.ano_utilizacao),
        rubrica: material.rubrica || "MATERIAIS"
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              materiais: [...wp.materiais, newMaterial]
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeMaterial: async (workpackageId: string, materialId: number) => {
      const confirmado = await confirmar({
        titulo: "Remover material",
        descricao: "Tem a certeza que deseja remover este material? Esta ação não pode ser desfeita.",
        tipo: "erro",
        labelConfirmar: "Remover",
        labelCancelar: "Cancelar",
        destrutivo: true
      });

      if (confirmado) {
        const updatedWorkpackages = state.workpackages.map(wp =>
          wp.id === workpackageId
            ? {
                ...wp,
                materiais: wp.materiais.filter(m => m.id !== materialId)
              }
            : wp
        );

        dispatch({
          type: "UPDATE_PROJETO",
          data: { workpackages: updatedWorkpackages }
        });
        toast.success("Material removido com sucesso!");
      }
    },

    // Entregáveis
    addEntregavel: (workpackageId: string, tarefaId: string, entregavel: any) => {
      const newEntregavel = {
        ...entregavel,
        id: crypto.randomUUID(),
        descricao: entregavel.descricao || null,
        data: entregavel.data ? new Date(entregavel.data) : null,
        anexo: entregavel.anexo || null
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: wp.tarefas.map(t =>
                t.id === tarefaId
                  ? {
                      ...t,
                      entregaveis: [...t.entregaveis, newEntregavel]
                    }
                  : t
              )
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeEntregavel: async (workpackageId: string, tarefaId: string, entregavelId: string) => {
      const confirmado = await confirmar({
        titulo: "Remover entregável",
        descricao: "Tem a certeza que deseja remover este entregável? Esta ação não pode ser desfeita.",
        tipo: "erro",
        labelConfirmar: "Remover",
        labelCancelar: "Cancelar",
        destrutivo: true
      });

      if (confirmado) {
        const updatedWorkpackages = state.workpackages.map(wp =>
          wp.id === workpackageId
            ? {
                ...wp,
                tarefas: wp.tarefas.map(t =>
                  t.id === tarefaId
                    ? {
                        ...t,
                        entregaveis: t.entregaveis.filter(e => e.id !== entregavelId)
                      }
                    : t
                )
              }
            : wp
        );

        dispatch({
          type: "UPDATE_PROJETO",
          data: { workpackages: updatedWorkpackages }
        });
        toast.success("Entregável removido com sucesso!");
      }
    }
  };

  return (
    <div className="space-y-4 px-6 pt-4 pb-6">
      {isAddingWP && (
        <WorkpackageForm
          onSubmit={handlers.addWorkpackage}
          onCancel={() => setIsAddingWP(false)}
        />
      )}

      {editingWP && (
        <WorkpackageForm
          onSubmit={(workpackage) => {
            const updatedWorkpackage = {
              ...editingWP,
              ...workpackage,
              tarefas: editingWP.tarefas || [],
              materiais: editingWP.materiais || [],
              recursos: editingWP.recursos || []
            } as WorkpackageWithRelations;
            
            const updatedWorkpackages = state.workpackages.map(wp =>
              wp.id === updatedWorkpackage.id ? updatedWorkpackage : wp
            );
            
            dispatch({
              type: "UPDATE_PROJETO",
              data: {
                workpackages: updatedWorkpackages
              }
            });
            
            setEditingWP(null);
            toast.success("Workpackage atualizado com sucesso!");
          }}
          onCancel={() => setEditingWP(null)}
          initialData={editingWP}
        />
      )}

      {state.workpackages?.length > 0 ? (
        <ScrollArea className="max-h-[calc(100vh-180px)]">
          <div className="space-y-4 pr-4">
            {state.workpackages.map((wp) => (
              <WorkpackageItem
                key={wp.id}
                workpackage={wp}
                onEdit={(workpackage) => {
                  setEditingWP(workpackage);
                }}
                onDelete={handlers.removeWorkpackage}
                handlers={handlers}
              />
            ))}
            
            {/* Botão subtil para adicionar novo workpackage */}
            {!isAddingWP && !editingWP && (
              <div 
                onClick={() => setIsAddingWP(true)}
                className="border border-dashed border-azul/20 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-azul/5 transition-colors group"
              >
                <div className="flex items-center gap-2 text-azul/60 group-hover:text-azul/80">
                  <Plus className="h-5 w-5" />
                  <span className="text-base font-medium">Adicionar workpackage</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div 
          onClick={() => setIsAddingWP(true)}
          className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-lg border border-azul/10 shadow-sm hover:border-azul/20 cursor-pointer transition-all"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-azul/5 flex items-center justify-center border border-azul/10 group-hover:bg-azul/10">
              <Briefcase className="h-10 w-10 text-azul/40" />
            </div>
            <div>
              <p className="font-medium text-lg text-azul/70">Nenhum workpackage adicionado</p>
              <p className="text-base mt-2 text-azul/60">Clique para adicionar o primeiro workpackage</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}