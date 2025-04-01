"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as ExcelJS from "exceljs";
import { api } from "@/trpc/react";

export default function ExportarProjetoButton({ projetoId }: { projetoId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  // Obter dados completos do projeto
  const { data: projeto } = api.projeto.findById.useQuery(projetoId, {
    enabled: !!projetoId,
    staleTime: Infinity, // Evitar refetch desnecessário
    refetchOnWindowFocus: false,
  });

  // Obter dados financeiros do projeto
  const { data: financas } = api.financas.getFinancas.useQuery(
    {
      projetoId,
    },
    {
      enabled: !!projetoId,
      staleTime: Infinity, // Evitar refetch desnecessário
      refetchOnWindowFocus: false,
    }
  );

  const handleExportar = async () => {
    if (!projeto || !financas) {
      toast.error("Dados do projeto ou financeiros ainda não carregados.");
      return;
    }

    setIsLoading(true);

    try {
      // Criar um novo workbook ExcelJS do zero
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Star Softflow";
      workbook.lastModifiedBy = "Star Softflow";
      workbook.created = new Date();
      workbook.modified = new Date();

      // Função auxiliar para definir valor e formato da célula
      const setCellValue = (
        sheet: ExcelJS.Worksheet,
        cellAddress: string,
        value: any,
        numFormat?: string,
        style?: Partial<ExcelJS.Style>
      ) => {
        try {
          const cell = sheet.getCell(cellAddress);
          cell.value = value;

          if (numFormat) {
            cell.numFmt = numFormat;
          }

          if (style) {
            if (style.font) cell.font = style.font;
            if (style.alignment) cell.alignment = style.alignment;
            if (style.border) cell.border = style.border;
            if (style.fill) cell.fill = style.fill;
          }
        } catch (e) {
          console.warn(`Erro ao definir célula ${cellAddress} para valor ${value}:`, e);
        }
      };

      // Função auxiliar para agrupar recursos por utilizador
      const agruparRecursosPorUtilizador = function (recursos: any[] = []) {
        const map = new Map<string, any[]>();
        recursos.forEach((recurso) => {
          if (!recurso.userId) return;
          if (!map.has(recurso.userId)) map.set(recurso.userId, []);
          const userRecursos = map.get(recurso.userId);
          if (userRecursos) {
            userRecursos.push(recurso);
          }
        });
        return map;
      };

      // Função para converter número de coluna em letra (A, B, ..., Z, AA, AB, etc.)
      const numberToExcelColumn = (num: number): string => {
        let s = "";
        let n = num;
        while (n >= 0) {
          s = String.fromCharCode((n % 26) + 65) + s;
          n = Math.floor(n / 26) - 1;
        }
        return s;
      };

      // === CRIAR E PREENCHER A PLANILHA INFO ===
      const infoSheet = workbook.addWorksheet("INFO");
      infoSheet.properties.tabColor = { argb: "0070C0" };

      // Adicionar cabeçalho
      infoSheet.mergeCells("A1:F1");
      setCellValue(infoSheet, "A1", "INFORMAÇÕES DO PROJETO", undefined, {
        font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "0070C0" } },
      });
      infoSheet.getRow(1).height = 30;

      // Definir largura das colunas
      infoSheet.getColumn("A").width = 20;
      infoSheet.getColumn("B").width = 50;

      // Configurar linhas de informação
      const infoRows = [
        { label: "Nome do Projeto", value: projeto.nome },
        { label: "Descrição", value: projeto.descricao || "" },
        { label: "Estado", value: projeto.estado },
        {
          label: "Data de Início",
          value: projeto.inicio ? new Date(projeto.inicio) : "",
          format: "dd/mm/yyyy",
        },
        {
          label: "Data de Fim",
          value: projeto.fim ? new Date(projeto.fim) : "",
          format: "dd/mm/yyyy",
        },
        { label: "Responsável", value: projeto.responsavel?.name || "" },
        { label: "Email do Responsável", value: projeto.responsavel?.email || "" },
      ];

      infoRows.forEach((row, i) => {
        const rowIndex = i + 2;
        setCellValue(infoSheet, `A${rowIndex}`, row.label, undefined, {
          font: { bold: true },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E6F2FF" } },
        });
        setCellValue(infoSheet, `B${rowIndex}`, row.value, row.format);
      });

      // === CRIAR E PREENCHER A PLANILHA ORÇAMENTO ===
      const budgetSheet = workbook.addWorksheet("ORÇAMENTO");
      budgetSheet.properties.tabColor = { argb: "92D050" };

      // Adicionar cabeçalho
      budgetSheet.mergeCells("A1:F1");
      setCellValue(budgetSheet, "A1", "ORÇAMENTO DO PROJETO", undefined, {
        font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "92D050" } },
      });
      budgetSheet.getRow(1).height = 30;

      // Definir largura das colunas
      budgetSheet.getColumn("A").width = 25;
      budgetSheet.getColumn("B").width = 20;

      // Parâmetros financeiros
      setCellValue(budgetSheet, "A3", "PARÂMETROS FINANCEIROS", undefined, {
        font: { bold: true, size: 12 },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E6F2FF" } },
      });

      const valorETI = financas.parametros.valor_eti;
      const taxa = financas.parametros.taxa_financiamento / 100;
      const overhead = financas.parametros.overhead / 100;

      const paramRows = [
        { label: "Financiamento", value: projeto.financiamento?.nome || "" },
        { label: "Taxa de Financiamento", value: taxa, format: "0.00%" },
        { label: "Overhead", value: overhead, format: "0.00%" },
        { label: "Valor ETI", value: Number(valorETI), format: "#,##0.00 €" },
      ];

      paramRows.forEach((row, i) => {
        const rowIndex = i + 4;
        setCellValue(budgetSheet, `A${rowIndex}`, row.label, undefined, {
          font: { bold: true },
        });
        setCellValue(budgetSheet, `B${rowIndex}`, row.value, row.format);
      });

      // Resumo financeiro
      setCellValue(budgetSheet, "A9", "RESUMO FINANCEIRO", undefined, {
        font: { bold: true, size: 12 },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E6F2FF" } },
      });

      const financeRows = [
        {
          label: "Orçamento Submetido",
          value: Number(financas.orcamento.submetido),
          format: "#,##0.00 €",
        },
        {
          label: "Valor Financiado",
          value: Number(financas.financeiro.valorFinanciado),
          format: "#,##0.00 €",
        },
        {
          label: "Custo Real (Recursos)",
          value: Number(financas.orcamento.real.recursos),
          format: "#,##0.00 €",
        },
        {
          label: "Custo Real (Materiais)",
          value: Number(financas.orcamento.real.materiais),
          format: "#,##0.00 €",
        },
        { label: "Resultado", value: Number(financas.financeiro.resultado), format: "#,##0.00 €" },
      ];

      financeRows.forEach((row, i) => {
        const rowIndex = i + 10;
        setCellValue(budgetSheet, `A${rowIndex}`, row.label, undefined, {
          font: { bold: true },
        });
        setCellValue(budgetSheet, `B${rowIndex}`, row.value, row.format);
      });

      // === CRIAR E PREENCHER A PLANILHA RECURSOS ===
      const rhSheet = workbook.addWorksheet("RECURSOS");
      rhSheet.properties.tabColor = { argb: "FFC000" };

      // Definir cabeçalho fixo
      setCellValue(rhSheet, "A1", "ALOCAÇÃO DE RECURSOS POR WORKPACKAGE", undefined, {
        font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC000" } },
      });
      rhSheet.mergeCells("A1:L1");
      rhSheet.getRow(1).height = 30;

      // Determinar intervalos de meses para o projeto
      const dataInicio = projeto.inicio ? new Date(projeto.inicio) : new Date();
      const dataFim = projeto.fim
        ? new Date(projeto.fim)
        : new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);

      const anoInicio = dataInicio.getFullYear();
      const mesInicio = dataInicio.getMonth() + 1;
      const anoFim = dataFim.getFullYear();
      const mesFim = dataFim.getMonth() + 1;

      // Calcular número de meses no projeto
      const numMeses = (anoFim - anoInicio) * 12 + (mesFim - mesInicio) + 1;
      const mesesProjeto = Array.from({ length: numMeses }, (_, i) => {
        const ano = anoInicio + Math.floor((mesInicio + i - 1) / 12);
        const mes = ((mesInicio + i - 1) % 12) + 1;
        return { ano, mes };
      });

      // Definir cabeçalhos para colunas fixas e meses
      const colunasFixas = [
        { header: "CÓDIGO", key: "codigo", width: 10 },
        { header: "WORKPACKAGE / RECURSO", key: "nome", width: 30 },
        { header: "TIPO", key: "tipo", width: 8 },
        { header: "DESCRIÇÃO", key: "descricao", width: 30 },
        { header: "INÍCIO", key: "inicio", width: 10 },
        { header: "DURAÇÃO", key: "duracao", width: 10 },
      ];

      // Adicionar colunas fixas
      colunasFixas.forEach((col, i) => {
        rhSheet.getColumn(i + 1).width = col.width;
        setCellValue(rhSheet, `${String.fromCharCode(65 + i)}3`, col.header, undefined, {
          font: { bold: true },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E6F2FF" } },
          alignment: { horizontal: "center" },
        });
      });

      // Adicionar cabeçalhos de mês
      mesesProjeto.forEach((periodo, i) => {
        const colIndex = i + colunasFixas.length + 1;
        const colLetter = numberToExcelColumn(colIndex - 1);

        // Adicionar ano na linha 3
        setCellValue(rhSheet, `${colLetter}3`, `${periodo.mes}/${periodo.ano}`, undefined, {
          font: { bold: true },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E6F2FF" } },
          alignment: { horizontal: "center" },
        });

        rhSheet.getColumn(colIndex).width = 10;
      });

      // Preencher dados de workpackages e recursos
      let currentRow = 4;
      let atividadeCounter = 1;

      if (projeto.workpackages && projeto.workpackages.length > 0) {
        for (const wp of projeto.workpackages) {
          const codigo = `A${atividadeCounter++}`;

          // Linha do Workpackage
          setCellValue(rhSheet, `A${currentRow}`, codigo);
          setCellValue(rhSheet, `B${currentRow}`, `${codigo} - ${wp.nome}`);
          setCellValue(rhSheet, `C${currentRow}`, "WP");
          setCellValue(rhSheet, `D${currentRow}`, wp.descricao || "");

          if (wp.inicio && wp.fim) {
            const inicio = new Date(wp.inicio);
            const fim = new Date(wp.fim);
            const diffTime = Math.abs(fim.getTime() - inicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffMonths = Math.max(1, Math.ceil(diffDays / 30));

            setCellValue(rhSheet, `E${currentRow}`, inicio, "dd/mm/yyyy");
            setCellValue(rhSheet, `F${currentRow}`, diffMonths);
          }

          // Estilizar linha de WP
          rhSheet.getRow(currentRow).eachCell((cell: ExcelJS.Cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" },
            };
            cell.font = { bold: true };
          });

          currentRow++;

          // Recursos do WP
          const recursosAgrupados = agruparRecursosPorUtilizador(wp.recursos);
          for (const [userId, recursos] of recursosAgrupados.entries()) {
            if (!recursos.length || !recursos[0].user) continue;
            const user = recursos[0].user;

            // Linha do Recurso
            setCellValue(rhSheet, `B${currentRow}`, user.name || "Recurso");
            setCellValue(rhSheet, `C${currentRow}`, "RH");

            // Duração do recurso
            let minAno = Number.MAX_SAFE_INTEGER,
              minMes = 13,
              maxAno = 0,
              maxMes = 0;
            recursos.forEach((r) => {
              if (r.ano < minAno || (r.ano === minAno && r.mes < minMes)) {
                minAno = r.ano;
                minMes = r.mes;
              }
              if (r.ano > maxAno || (r.ano === maxAno && r.mes > maxMes)) {
                maxAno = r.ano;
                maxMes = r.mes;
              }
            });

            const duracaoRecurso =
              minAno !== Number.MAX_SAFE_INTEGER
                ? (maxAno - minAno) * 12 + (maxMes - minMes) + 1
                : 1;
            setCellValue(rhSheet, `F${currentRow}`, duracaoRecurso);

            // Alocações mensais
            mesesProjeto.forEach((periodo, i) => {
              const colIndex = i + colunasFixas.length + 1;
              const colLetter = numberToExcelColumn(colIndex - 1);

              const alocacao = recursos.find((r) => r.ano === periodo.ano && r.mes === periodo.mes);
              if (alocacao) {
                setCellValue(
                  rhSheet,
                  `${colLetter}${currentRow}`,
                  Number(alocacao.ocupacao),
                  "0.00%"
                );
              }
            });

            currentRow++;
          }
        }
      }

      // === CRIAR E PREENCHER A PLANILHA MATERIAIS ===
      const materiaisSheet = workbook.addWorksheet("MATERIAIS");
      materiaisSheet.properties.tabColor = { argb: "C55A11" };

      // Adicionar cabeçalho
      materiaisSheet.mergeCells("A1:H1");
      setCellValue(materiaisSheet, "A1", "MATERIAIS E OUTROS CUSTOS", undefined, {
        font: { bold: true, size: 14, color: { argb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle" },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "C55A11" } },
      });
      materiaisSheet.getRow(1).height = 30;

      // Definir largura das colunas
      const materiaisCols = [
        { header: "NOME", key: "nome", width: 25 },
        { header: "WP", key: "wp", width: 10 },
        { header: "DESCRIÇÃO", key: "descricao", width: 30 },
        { header: "ANO", key: "ano", width: 10 },
        { header: "CATEGORIA", key: "categoria", width: 20 },
        { header: "PREÇO UNITÁRIO", key: "preco", width: 15 },
        { header: "QUANTIDADE", key: "quantidade", width: 15 },
        { header: "TOTAL", key: "total", width: 15 },
      ];

      materiaisCols.forEach((col, i) => {
        materiaisSheet.getColumn(i + 1).width = col.width;
        setCellValue(materiaisSheet, `${String.fromCharCode(65 + i)}3`, col.header, undefined, {
          font: { bold: true },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: "E6F2FF" } },
          alignment: { horizontal: "center" },
        });
      });

      // Preencher dados de materiais
      currentRow = 4;
      let wpCounter = 1;

      if (projeto.workpackages) {
        for (const wp of projeto.workpackages) {
          const codigoWP = `A${wpCounter++}`;
          if (wp.materiais && wp.materiais.length > 0) {
            for (const material of wp.materiais) {
              setCellValue(materiaisSheet, `A${currentRow}`, material.nome);
              setCellValue(materiaisSheet, `B${currentRow}`, codigoWP);
              setCellValue(materiaisSheet, `C${currentRow}`, material.descricao || "");
              setCellValue(materiaisSheet, `D${currentRow}`, material.ano_utilizacao);

              const mapeamento: Record<string, string> = {
                MATERIAIS: "Materiais",
                SERVICOS_TERCEIROS: "Serviços Terceiros",
                OUTROS_SERVICOS: "Outros Serviços",
                DESLOCACAO_ESTADIAS: "Deslocações e Estadas",
                OUTROS_CUSTOS: "Outros Custos",
                CUSTOS_ESTRUTURA: "Custos Estrutura",
              };
              setCellValue(
                materiaisSheet,
                `E${currentRow}`,
                mapeamento[material.rubrica] || "Materiais"
              );

              const preco = Number(material.preco);
              setCellValue(materiaisSheet, `F${currentRow}`, preco, "#,##0.00 €");
              setCellValue(materiaisSheet, `G${currentRow}`, material.quantidade);
              setCellValue(
                materiaisSheet,
                `H${currentRow}`,
                preco * material.quantidade,
                "#,##0.00 €"
              );

              currentRow++;
            }
          }
        }
      }

      // === GERAR O FICHEIRO EXCEL ===
      const nomeFicheiro = `${projeto.nome.replace(/[^a-z0-9]/gi, "_")}_exportado.xlsx`;

      // Gerar buffer do Excel
      const excelData = await workbook.xlsx.writeBuffer();
      console.log("Buffer gerado com sucesso:", excelData.byteLength, "bytes");

      // Criar Blob e URL para download
      const blob = new Blob([excelData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      // Criar link de download e simular clique
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeFicheiro;
      document.body.appendChild(a);
      a.click();

      // Limpar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Projeto exportado com sucesso!");
    } catch (error) {
      console.error("Erro detalhado ao exportar projeto:", error);
      toast.error(
        `Ocorreu um erro ao exportar: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="bg-azul font-medium text-white hover:bg-azul/90"
      onClick={handleExportar}
      disabled={isLoading || !projeto || !financas}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg
            className="-ml-1 mr-3 h-4 w-4 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          A exportar...
        </span>
      ) : (
        <span className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </span>
      )}
    </Button>
  );
}
