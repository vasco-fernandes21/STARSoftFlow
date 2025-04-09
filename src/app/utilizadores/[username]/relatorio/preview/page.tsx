"use client";

import { RelatorioTemplate } from "../templates/relatorio-template";
import { ProjetoEstado } from "@prisma/client";

// Dados de exemplo para testar o template
const dadosExemplo = {
  utilizador: {
    id: "1",
    nome: "João Silva",
  },
  configuracaoMensal: {
    diasUteis: 22,
    horasPotenciais: 176,
  },
  alocacoes: [
    {
      workpackageId: "WP1",
      workpackageNome: "PPS1: BE-LCV",
      projetoId: "1",
      projetoNome: "AGENDA GREEN AUTO",
      projetoEstado: ProjetoEstado.EM_DESENVOLVIMENTO,
      ocupacao: 0.3, // 30%
    },
    {
      workpackageId: "WP9",
      workpackageNome: "PPS16: Sistema de drones para controlo de qualidade",
      projetoId: "1",
      projetoNome: "AGENDA GREEN AUTO",
      projetoEstado: ProjetoEstado.EM_DESENVOLVIMENTO,
      ocupacao: 0.2, // 20%
    },
    {
      workpackageId: "LA1",
      workpackageNome: "Prospetiva Tecnológica e de Mercado",
      projetoId: "2",
      projetoNome: "MISSÃO DE INTERFACE - CTI",
      projetoEstado: ProjetoEstado.APROVADO,
      ocupacao: 0.25, // 25%
    },
    {
      workpackageId: "LA2",
      workpackageNome: "Investigação, Desenvolvimento e Inovação",
      projetoId: "2",
      projetoNome: "MISSÃO DE INTERFACE - CTI",
      projetoEstado: ProjetoEstado.APROVADO,
      ocupacao: 0.15, // 15%
    },
  ],
};

export default function PreviewPage() {
  // Converter o template HTML em uma string e usar dangerouslySetInnerHTML
  const templateHtml = RelatorioTemplate({
    data: dadosExemplo,
    periodo: { mes: 3, ano: 2024 },
  });

  return (
    <div 
      className="min-h-screen bg-white"
      dangerouslySetInnerHTML={{ __html: templateHtml }}
    />
  );
} 