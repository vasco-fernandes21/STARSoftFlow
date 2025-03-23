import { FaseType, fases } from "../types";

interface ProjetoFormPanelProps {
  faseAtual: FaseType;
  children: React.ReactNode;
}

export function ProjetoFormPanel({
  faseAtual,
  children
}: ProjetoFormPanelProps) {
  const IconComponent = fases[faseAtual].icon;
  
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="p-2">
        {children}
      </div>
    </div>
  );
}
