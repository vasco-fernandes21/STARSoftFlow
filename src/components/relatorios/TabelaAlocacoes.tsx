"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Alocacao {
  id: string;
  mes: number;
  ano: number;
  ocupacao: number;
  projeto: {
    id: string;
    nome: string;
  };
  workpackage: {
    id: string;
    nome: string;
  };
}

interface TabelaAlocacoesProps {
  alocacoes: {
    real: Alocacao[];
    submetido: Alocacao[];
  };
  viewMode: "real" | "submetido";
  ano: number;
  onSave: () => void;
}

export function TabelaAlocacoes({ alocacoes, viewMode, ano }: TabelaAlocacoesProps) {
  const alocacoesToShow = viewMode === "real" ? alocacoes.real : alocacoes.submetido;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Projeto</TableHead>
            <TableHead>Work Package</TableHead>
            <TableHead className="text-right">Ocupação (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alocacoesToShow.map((alocacao) => (
            <TableRow key={alocacao.id}>
              <TableCell>{alocacao.projeto.nome}</TableCell>
              <TableCell>{alocacao.workpackage.nome}</TableCell>
              <TableCell className="text-right">
                {alocacao.ocupacao.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
          {alocacoesToShow.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhuma alocação encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
} 