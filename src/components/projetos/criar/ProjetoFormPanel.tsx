import type { FaseType } from "../types";

interface ProjetoFormPanelProps {
  _faseAtual: FaseType;
  children: React.ReactNode;
}

export function ProjetoFormPanel({
  _faseAtual,
  children
}: ProjetoFormPanelProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="p-2">
        {children}
      </div>
    </div>
  );
}
