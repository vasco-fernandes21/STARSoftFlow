import type { FaseType } from "../types";

interface ProjetoFormPanelProps {
  _faseAtual: FaseType;
  children: React.ReactNode;
}

export function ProjetoFormPanel({ _faseAtual, children }: ProjetoFormPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <div className="p-2">{children}</div>
    </div>
  );
}
