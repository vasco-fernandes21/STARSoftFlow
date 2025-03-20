import { useState } from "react";
import { WorkpackageWithRelations } from "../../types";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkpackageItem } from "./workpackage/item";
import { WorkpackageForm } from "./workpackage/form";
import { useConfirmacao } from "@/providers/PopupConfirmacaoProvider";
import { Prisma } from "@prisma/client";
import { useProjetoForm } from "../../ProjetoFormContext";

// Importar a interface WorkpackageHandlers
import { WorkpackageHandlers } from "@/app/projetos/criar/page";

// Adicionar import do TabNavigation
import { TabNavigation } from "../../components/TabNavigation";

// Componentes simples de Accordion para substituir os imports que estão faltando
const Accordion = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`divide-y divide-azul/10 ${className}`} {...props}>{children}</div>
);

const AccordionItem = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`py-2 ${className}`} {...props}>{children}</div>
);

const AccordionTrigger = ({ children, className = "", onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button 
    className={`flex w-full justify-between items-center py-2 text-left font-medium ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
    <span className="text-azul/60">▼</span>
  </button>
);

const AccordionContent = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`pt-2 pb-1 ${className}`} {...props}>{children}</div>
);

interface WorkpackagesTabProps {
  workpackages?: WorkpackageWithRelations[];
  handlers: WorkpackageHandlers & {
    addWorkpackage: (workpackage: Omit<WorkpackageWithRelations, "id" | "tarefas" | "materiais" | "recursos">) => void;
    updateWorkpackage: (id: string, data: Partial<WorkpackageWithRelations>) => void;
    removeWorkpackage: (id: string) => void;
  };
  onNavigateForward: () => void;
  onNavigateBack: () => void;
}

export function WorkpackagesTab({ workpackages = [], handlers, onNavigateForward, onNavigateBack }: WorkpackagesTabProps) {
  const [addingWorkpackage, setAddingWorkpackage] = useState(false);
  const [editingWorkpackage, setEditingWorkpackage] = useState<WorkpackageWithRelations | null>(null);
  const { confirmar } = useConfirmacao();
  const { state: projeto } = useProjetoForm();

  // Função para converter WorkpackageWithRelations para o formato esperado pelo WorkpackageForm
  const convertToFormData = (wp: WorkpackageWithRelations) => {
    return {
      nome: wp.nome,
      descricao: wp.descricao || undefined, // Converter null para undefined
      inicio: wp.inicio || undefined,
      fim: wp.fim || undefined,
      estado: wp.estado
    };
  };

  // Função para converter dados do formulário para o formato esperado pelo handler
  const handleAddWorkpackage = (workpackage: Omit<Prisma.WorkpackageCreateInput, "projeto">) => {
    // Não precisamos adicionar projetoId aqui, pois será tratado pelo controlador
    const completeWorkpackage = {
      ...workpackage,
      // Não incluímos projetoId aqui
    } as Omit<WorkpackageWithRelations, "id" | "tarefas" | "materiais" | "recursos">;
    
    handlers.addWorkpackage(completeWorkpackage);
    setAddingWorkpackage(false);
  };

  const handleEditWorkpackage = (workpackage: WorkpackageWithRelations) => {
    setEditingWorkpackage(workpackage);
  };

  const handleUpdateWorkpackage = (id: string, data: Partial<Prisma.WorkpackageCreateInput>) => {
    // Converter para o formato esperado pelo handler
    const formattedData = {
      ...data,
      // Garantir que campos null sejam tratados corretamente
      descricao: data.descricao === null ? undefined : data.descricao,
      inicio: data.inicio === null ? undefined : data.inicio,
      fim: data.fim === null ? undefined : data.fim,
    } as Partial<WorkpackageWithRelations>;
    
    handlers.updateWorkpackage(id, formattedData);
    setEditingWorkpackage(null);
  };

  const handleDeleteWorkpackage = async (id: string) => {
    const confirmado = await confirmar({
      titulo: "Remover workpackage",
      descricao: "Tem a certeza que deseja remover este workpackage? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.",
      tipo: "erro",
      labelConfirmar: "Remover",
      labelCancelar: "Cancelar",
      destrutivo: true
    });

    if (confirmado) {
      handlers.removeWorkpackage(id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Formulários de adição/edição */}
      {addingWorkpackage && (
        <WorkpackageForm
          onSubmit={handleAddWorkpackage}
          onCancel={() => setAddingWorkpackage(false)}
          projetoInicio={projeto.inicio || undefined}
          projetoFim={projeto.fim || undefined}
        />
      )}

      {editingWorkpackage && (
        <WorkpackageForm
          initialData={convertToFormData(editingWorkpackage)}
          onSubmit={(data) => handleUpdateWorkpackage(editingWorkpackage.id, data)}
          onCancel={() => setEditingWorkpackage(null)}
          projetoInicio={projeto.inicio || undefined}
          projetoFim={projeto.fim || undefined}
        />
      )}

      {/* Lista de workpackages ou botão para adicionar */}
      {!addingWorkpackage && !editingWorkpackage && (
        <>
          {workpackages && workpackages.length > 0 ? (
            <div className="mb-4">
              <Button 
                onClick={() => setAddingWorkpackage(true)}
                className="bg-azul hover:bg-azul/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Workpackage
              </Button>
            </div>
          ) : null}
          
          <ScrollArea className="h-[calc(100vh-350px)]"> {/* Ajustei a altura para acomodar os botões */}
            <div className="space-y-4 pr-4">
              {workpackages && workpackages.length > 0 ? (
                workpackages.map(wp => (
                  <WorkpackageItem
                    key={wp.id}
                    workpackage={wp}  
                    onEdit={handleEditWorkpackage}
                    onDelete={handleDeleteWorkpackage}
                    handlers={handlers}
                    projetoInicio={wp.inicio || new Date()}
                    projetoFim={wp.fim || new Date()}
                  />
                ))
              ) : (
                <div 
                  className="text-center py-10 border border-dashed border-azul/20 rounded-xl bg-azul/5 
                            hover:bg-azul/10 hover:border-azul/30 transition-all duration-300 cursor-pointer
                            transform hover:scale-[1.01] active:scale-[0.99]"
                  onClick={() => setAddingWorkpackage(true)}
                >
                  <Briefcase className="h-10 w-10 text-azul/40 mx-auto mb-3" />
                  <p className="text-azul/60">Nenhum workpackage adicionado</p>
                  <p className="text-sm text-azul/50 mt-1">Clique aqui para adicionar um workpackage</p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 bg-azul/10 hover:bg-azul/20 text-azul"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Workpackage
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Substituir os botões de navegação pelo TabNavigation */}
      <TabNavigation
        onNext={onNavigateForward}
        onBack={onNavigateBack}
        nextLabel="Próximo: Recursos"
        backLabel="Anterior: Finanças"
        isNextDisabled={!workpackages || workpackages.length === 0}
        className="pt-4 border-t border-azul/10"
      />
    </div>
  );
} 