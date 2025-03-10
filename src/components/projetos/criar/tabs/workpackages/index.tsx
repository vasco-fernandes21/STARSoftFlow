import { useState } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { ProjetoCreateInput, WorkpackageWithRelations } from "../../types";
import { TabNavigation } from "../../components/TabNavigation";
import { Briefcase, Plus, FilePlus2, CalendarRange, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField, TextareaField, DateField } from "../../components/FormFields";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// Importar de @/components/ui/accordion se existir, ou criar um componente simples
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { v4 as uuidv4 } from "uuid";
import { WorkpackageManager } from "./WorkpackageManager";

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
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

export function WorkpackagesTab({ onNavigateBack, onNavigateForward }: WorkpackagesTabProps) {
  const { state } = useProjetoForm();
  
  // Verificar se podemos avançar (pelo menos um workpackage)
  const isValid = state.workpackages && state.workpackages.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 w-full">
        <WorkpackageManager />
      </div>

      <TabNavigation
        onBack={onNavigateBack}
        onNext={onNavigateForward}
        backLabel="Anterior: Finanças"
        nextLabel="Próximo: Recursos"
        isNextDisabled={!isValid}
      />
    </div>
  );
} 