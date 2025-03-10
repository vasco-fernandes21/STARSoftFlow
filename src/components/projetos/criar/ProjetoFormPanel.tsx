import { FaseType, fases } from "./types";

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
      <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <IconComponent className="h-5 w-5 text-azul" />
          <div>
            <h2 className="text-lg font-medium text-gray-900">{fases[faseAtual].titulo}</h2>
            <p className="text-sm text-gray-500">{fases[faseAtual].descricao}</p>
          </div>
        </div>
      </div>
    
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}
