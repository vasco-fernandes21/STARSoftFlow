"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, FileSpreadsheet, Upload } from "lucide-react";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from "xlsx";
import { Decimal } from "decimal.js";
import type { Rubrica, Material as PrismaMaterial } from "@prisma/client";
import { toast } from "sonner";
import { generateUUID } from "@/server/api/utils/token";
import { api } from "@/trpc/react";
import { GerirFinanciamentosModal } from "@/components/projetos/criar/novo/financas/GerirFinanciamentosModal";

// Interfaces e Tipos
interface Alocacao {
  mes: number;
  ano: number;
  percentagem: number;
}

interface Recurso {
  nome: string;
  userId: string | null;
  alocacoes: Alocacao[];
}

type MaterialImportacao = Pick<
  PrismaMaterial,
  "nome" | "preco" | "quantidade" | "ano_utilizacao" | "rubrica"
> & {
  workpackageNome: string;
  descricao?: string | null;
  estado?: boolean;
};

interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
  materiais: MaterialImportacao[];
  dataInicio: Date | null;
  dataFim: Date | null;
}

// Tipo para o que vem da API
type FinanciamentoAPI = {
  id: number;
  nome: string;
  overhead: string;
  taxa_financiamento: string;
  valor_eti: string;
};

// Funções Utilitárias
function mapearRubrica(rubricaExcel: string): Rubrica {
  const mapeamento: Record<string, Rubrica> = {
    Materiais: "MATERIAIS",
    "Serviços Terceiros": "SERVICOS_TERCEIROS",
    "Outros Serviços": "OUTROS_SERVICOS",
    "Deslocações e Estadas": "DESLOCACAO_ESTADAS",
    "Outros Custos": "OUTROS_CUSTOS",
    "Custos Estrutura": "CUSTOS_ESTRUTURA",
  };
  return mapeamento[rubricaExcel] || "MATERIAIS";
}

function excelDateToJS(excelDate: number) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return {
    mes: date.getMonth() + 1,
    ano: date.getFullYear(),
  };
}

function converterExcelParaJson(workbook: XLSX.WorkBook): {
  [key: string]: any[][];
} {
  const sheetsData: { [key: string]: any[][] } = {};
  workbook.SheetNames.forEach((name) => {
    const sheet = workbook.Sheets[name];
    if (sheet) {
      sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }
  });
  return sheetsData;
}

// Funções de Extração de Dados
function extrairDadosProjeto(dados: any[][]) {
  let nomeProjeto = "";
  for (const linha of dados) {
    if (linha && linha.length >= 2 && linha[0] === "Nome do projeto ") {
      nomeProjeto = linha[1];
      break;
    }
  }
  return { nomeProjeto };
}

function extrairDadosFinanciamento(dadosBudget: any[][]): {
  tipoFinanciamento: string;
  taxaFinanciamento: number | null;
  overhead: number | null;
  valorEti: number | null;
} {
  let tipoFinanciamento = "";
  let taxaFinanciamento: number | null = null;
  let overhead: number | null = null;
  const valorEti: number | null = null;

  for (const linha of dadosBudget) {
    if (linha && linha.length >= 8) {
      if (linha[6] === "Tipo de projeto " && linha[7]) {
        tipoFinanciamento = linha[7];
      } else if (linha[6] === "Taxa de financiamento" && typeof linha[7] === "number") {
        taxaFinanciamento = linha[7] * 100; // Converter para percentagem
      } else if (linha[6] === "Custos indiretos" && typeof linha[7] === "number") {
        overhead = linha[7] * 100; // Converter para percentagem
      }
    }
  }

  return { tipoFinanciamento, taxaFinanciamento, overhead, valorEti };
}

function extrairValorEti(dadosRH: any[][]): number | null {
  for (let i = 0; i < dadosRH.length; i++) {
    const row = dadosRH[i];
    if (!row || row.length < 6) continue;

    if (row[4] && typeof row[4] === "string" && row[5] && typeof row[5] === "number") {
      return row[5]; // O valor ETI está na coluna 6 (índice 5)
    }
  }
  return null;
}

function extrairMateriais(data: any[][]): MaterialImportacao[] {
  const materiais: MaterialImportacao[] = [];

  for (let i = 6; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const despesa = row[0];
    const atividade = row[1];
    const ano = row[3];
    const rubrica = row[4];
    const custoUnitario = row[5];
    const unidades = row[6];

    if (!despesa || !atividade || !custoUnitario || !unidades) continue;

    if (typeof custoUnitario === "number" && typeof unidades === "number") {
      materiais.push({
        nome: despesa,
        preco: new Decimal(custoUnitario),
        quantidade: unidades,
        ano_utilizacao: typeof ano === "number" ? ano : new Date().getFullYear(),
        rubrica: mapearRubrica(rubrica),
        workpackageNome: atividade,
        descricao: null,
        estado: false,
      });
    }
  }

  return materiais;
}

function extrairUtilizadores(apiResponse: any): any[] {
  if (!apiResponse) return [];

  if (apiResponse.result?.data?.json?.items && Array.isArray(apiResponse.result.data.json.items)) {
    return apiResponse.result.data.json.items;
  }

  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }

  if (apiResponse.json?.items && Array.isArray(apiResponse.json.items)) {
    return apiResponse.json.items;
  }

  if (apiResponse.json && Array.isArray(apiResponse.json)) {
    return apiResponse.json;
  }

  if (Array.isArray(apiResponse)) {
    return apiResponse;
  }

  return [];
}

function extrairDadosRH(
  data: any[][],
  utilizadores: any[]
): {
  workpackages: WorkpackageSimples[];
  dataInicioProjeto: Date | null;
  dataFimProjeto: Date | null;
} {
  const wps: WorkpackageSimples[] = [];
  let wpAtual: WorkpackageSimples | null = null;

  const linhaAnos = data[3] || [];
  const linhaMeses = data[4] || [];

  const colunasDatasMap = new Map<number, { mes: number; ano: number }>();
  let primeiraColunaIdx = -1;
  let ultimaColunaIdx = -1;

  const inicioBuscaColuna = 5; 
  for (let i = inicioBuscaColuna; i < linhaMeses.length; i++) {
    if (
      typeof linhaAnos[i] === "number" &&
      typeof linhaMeses[i] === "number" &&
      linhaMeses[i] > 0 
    ) {
      try {
        const { mes, ano } = excelDateToJS(linhaMeses[i]);
        if (ano === linhaAnos[i]) { 
          colunasDatasMap.set(i, { mes, ano });
          if (primeiraColunaIdx === -1) {
            primeiraColunaIdx = i;
          }
          ultimaColunaIdx = i; 
        }
      } catch (error) {
        // Ignorar erros
      }
    }
  }

  if (primeiraColunaIdx === -1) {
    console.error("[Importação] Nenhuma coluna de data válida encontrada no cabeçalho da folha RH.");
    return { workpackages: [], dataInicioProjeto: null, dataFimProjeto: null };
  }

  const primeiraDataInfo = colunasDatasMap.get(primeiraColunaIdx)!;
  const ultimaDataInfo = colunasDatasMap.get(ultimaColunaIdx)!;
  const dataInicioProjeto = new Date(primeiraDataInfo.ano, primeiraDataInfo.mes - 1, 1);
  const dataFimProjeto = new Date(ultimaDataInfo.ano, ultimaDataInfo.mes, 0); 

  const colunasDatasArray = Array.from(colunasDatasMap.entries())
                               .map(([coluna, data]) => ({ coluna, ...data }))
                               .sort((a, b) => a.coluna - b.coluna);

  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const codigo = typeof row[1] === "string" && row[1].match(/^A\d+$/) ? row[1].trim() : null;
    const nome   = typeof row[2] === "string" && row[2].trim() ? row[2].trim() : null;

    if (codigo && nome) {
      wpAtual = { codigo, nome, recursos: [], materiais: [], dataInicio: null, dataFim: null };
      wps.push(wpAtual);
      continue; 
    }

    if (
      wpAtual &&
      !row[1] &&
      typeof row[3] === "string" &&
      row[3].trim() &&
      row[3] !== "contagem células cinza" 
    ) {
      const nomeRecurso = row[3].trim();

      const nomeRecursoLower = nomeRecurso.toLowerCase();
      const excelNameTrimmedLower = nomeRecursoLower.trim(); // Processar nome do Excel uma vez

      // 1. Encontrar todas as correspondências parciais (DB name inclui Excel name)
      const potentialMatches = utilizadores.filter(u => {
          const dbNameTrimmedLower = u.name?.trim().toLowerCase();
          return dbNameTrimmedLower?.includes(excelNameTrimmedLower);
      });

      let userId: string | null = null;
      let utilizador: { id: string; name: string | null } | null = null;

      // 2. Verificar unicidade
      if (potentialMatches.length === 1) {
          utilizador = potentialMatches[0]!;
          userId = utilizador?.id || null;
          console.log(`[Importação - Match Único] Excel: '${excelNameTrimmedLower}' correspondeu UNICAMENTE a DB: '${utilizador?.name?.trim().toLowerCase()}' (ID: ${userId})`);
      } else if (potentialMatches.length > 1) {
          console.warn(`[Importação - Ambiguidade] Excel: '${excelNameTrimmedLower}' correspondeu a MÚLTIPLOS utilizadores na DB: ${potentialMatches.map(u => `'${u.name}'`).join(', ')}. Nenhuma alocação será feita.`);
      } else {
          // Nenhuma correspondência encontrada (nem parcial)
          // console.log(`[Importação - Sem Match] Excel: '${excelNameTrimmedLower}' não correspondeu a nenhum utilizador na DB.`); // Opcional: log se não houver match
      }
      
      // Apenas continuar se encontrámos um utilizador único
      if (userId) {
          const recurso: Recurso = { nome: nomeRecurso, userId: userId, alocacoes: [] };

          let dataInicioRecurso: Date | null = null;
          let dataFimRecurso: Date | null = null;

          for (const colData of colunasDatasArray) {
              const valor = row[colData.coluna];
              
              if (typeof valor === "number" && !isNaN(valor) && valor > 0 && valor <= 1) {
                 const percentagem = valor * 100;
                 recurso.alocacoes.push({ mes: colData.mes, ano: colData.ano, percentagem: percentagem });

                 const dataAlocInicio = new Date(colData.ano, colData.mes - 1, 1);
                 const dataAlocFim = new Date(colData.ano, colData.mes, 0); 

                 if (!dataInicioRecurso || dataAlocInicio < dataInicioRecurso) {
                   dataInicioRecurso = dataAlocInicio;
                 }
                 if (!dataFimRecurso || dataAlocFim > dataFimRecurso) {
                   dataFimRecurso = dataAlocFim;
                 }
              } 
          }

          if (recurso.alocacoes.length > 0 && wpAtual) { // Não precisa verificar userId aqui, já foi feito
              wpAtual.recursos.push(recurso);
              
              const alocacoesString = recurso.alocacoes
                  .map(a => `${String(a.mes).padStart(2, '0')}/${a.ano}: ${a.percentagem.toFixed(1)}%`)
                  .join(', ');
              console.log(`[Importação] Alocações para '${nomeRecurso}' (ID: ${recurso.userId}) no WP '${wpAtual.nome}': ${alocacoesString}`);

              if (dataInicioRecurso && (!wpAtual.dataInicio || dataInicioRecurso < wpAtual.dataInicio)) {
                wpAtual.dataInicio = dataInicioRecurso;
              }
              if (dataFimRecurso && (!wpAtual.dataFim || dataFimRecurso > wpAtual.dataFim)) {
                wpAtual.dataFim = dataFimRecurso;
              }
          } 
      }
    }
  }

  return { workpackages: wps, dataInicioProjeto, dataFimProjeto };
}

function atribuirMateriaisAosWorkpackages(
  workpackages: WorkpackageSimples[],
  materiais: MaterialImportacao[]
): WorkpackageSimples[] {
  const wpMap = new Map<string, WorkpackageSimples>();
  workpackages.forEach((wp) => {
    wpMap.set(wp.nome, wp);

    const wpCodigo = wp.nome.split(" - ")[0]?.trim();
    if (wpCodigo) {
      wpMap.set(wpCodigo, wp);
    }
  });

  materiais.forEach((material) => {
    let wpMatch = wpMap.get(material.workpackageNome);

    if (!wpMatch) {
      const codigoMatch = material.workpackageNome.match(/^A\d+/);
      if (codigoMatch) {
        wpMatch = workpackages.find((wp) => wp.codigo === codigoMatch[0]);
      }
    }

    if (wpMatch) {
      wpMatch.materiais.push(material);
    } else if (workpackages.length > 0 && workpackages[0]) {
      workpackages[0].materiais.push(material);
    }
  });

  return workpackages;
}

// Componente Principal
export default function ImportarProjetoButton() {
  const { dispatch } = useProjetoForm();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalFinanciamentosAberto, setModalFinanciamentosAberto] = useState(false);
  const [dadosFinanciamento, setDadosFinanciamento] = useState<{
    nome: string;
    overhead: number | null;
    taxa_financiamento: number | null;
    valor_eti: number | null;
  } | null>(null);

  const { data: financiamentosData } = api.financiamento.findAll.useQuery({ limit: 100 });
  const { data: utilizadoresData } = api.utilizador.findAll.useQuery();

  const handleFileUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsLoading(true);

    const utilizadores = extrairUtilizadores(utilizadoresData);

    if (utilizadores.length === 0) {
        toast.error("Não foi possível carregar a lista de utilizadores da base de dados.");
        setIsLoading(false);
        return;
    }

    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetsData = converterExcelParaJson(workbook);

        let wps: WorkpackageSimples[] = [];
        let materiais: MaterialImportacao[] = [];
        let dataInicioProjeto: Date | null = null;
        let dataFimProjeto: Date | null = null;
        let nomeProjeto = "";
        let tipoFinanciamento = "";
        let taxaFinanciamento: number | null = null;
        let overhead: number | null = null;
        let valorEti: number | null = null;

        if (sheetsData["HOME"]) {
          const dadosProjeto = extrairDadosProjeto(sheetsData["HOME"]);
          nomeProjeto = dadosProjeto.nomeProjeto;
        }

        if (sheetsData["BUDGET"]) {
          const dadosFinanciamentoExt = extrairDadosFinanciamento(sheetsData["BUDGET"]);
          tipoFinanciamento = dadosFinanciamentoExt.tipoFinanciamento;
          taxaFinanciamento = dadosFinanciamentoExt.taxaFinanciamento;
          overhead = dadosFinanciamentoExt.overhead;
          valorEti = dadosFinanciamentoExt.valorEti; 
        }

        if (sheetsData["RH_Budget_SUBM"]) {
          const valorEtiRH = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
          if (valorEtiRH !== null) {
            valorEti = valorEtiRH; 
          }
          const resultado = extrairDadosRH(sheetsData["RH_Budget_SUBM"], utilizadores);
          wps = resultado.workpackages;
          dataInicioProjeto = resultado.dataInicioProjeto;
          dataFimProjeto = resultado.dataFimProjeto;
        } else {
          console.warn("[Importação] Folha 'RH_Budget_SUBM' não encontrada no Excel.");
          toast.info("Folha 'RH_Budget_SUBM' não encontrada no ficheiro Excel.");
        }

        if (sheetsData["Outros_Budget"]) {
          materiais = extrairMateriais(sheetsData["Outros_Budget"]);
        } else {
          console.warn("[Importação] Folha 'Outros_Budget' não encontrada no Excel.");
        }

        if (wps.length > 0 && materiais.length > 0) {
          wps = atribuirMateriaisAosWorkpackages(wps, materiais);
        }

        dispatch({ type: "RESET" });

        dispatch({
          type: "UPDATE_PROJETO",
          data: {
            nome: nomeProjeto,
            inicio: dataInicioProjeto,
            fim: dataFimProjeto,
            overhead: overhead ? new Decimal(overhead / 100) : new Decimal(0),
            taxa_financiamento: taxaFinanciamento
              ? new Decimal(taxaFinanciamento / 100)
              : new Decimal(0),
            valor_eti: valorEti ? new Decimal(valorEti) : new Decimal(0),
          },
        });

        wps.forEach((wp) => {
          const wpId = generateUUID();

          dispatch({
            type: "ADD_WORKPACKAGE",
            workpackage: {
              id: wpId,
              nome: wp.nome,
              descricao: null,
              inicio: wp.dataInicio,
              fim: wp.dataFim,
              estado: false,
              tarefas: [],
              materiais: [], 
              recursos: [], 
            },
          });

          wp.recursos.forEach((recurso) => {
            if (!recurso.userId) {
                return; 
            }

            recurso.alocacoes.forEach((alocacao) => {
              dispatch({
                type: "ADD_ALOCACAO",
                workpackageId: wpId,
                alocacao: {
                  userId: recurso.userId!,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                  ocupacao: new Decimal(alocacao.percentagem / 100),
                },
              });
            });
          });

          wp.materiais.forEach((material) => {
            dispatch({
              type: "ADD_MATERIAL",
              workpackageId: wpId,
              material: {
                id: Math.floor(Math.random() * 1000000),
                nome: material.nome,
                preco: new Decimal(material.preco),
                quantidade: material.quantidade,
                mes: wp.dataInicio ? wp.dataInicio.getMonth() + 1 : new Date().getMonth() + 1,
                ano_utilizacao: material.ano_utilizacao,
                rubrica: material.rubrica,
                descricao: null,
                estado: false,
              },
            });
          });
        });

        if (tipoFinanciamento) {
          try {
            // ... (lógica de financiamento existente)

            // First cast to unknown, then properly map to the expected type
            const rawFinanciamentos = (financiamentosData?.items || []) as unknown as Array<{
                id: number;
                nome: string;
                overhead: Decimal | string;
                taxa_financiamento: Decimal | string;
                valor_eti: Decimal | string;
              }>;

              const financiamentos: FinanciamentoAPI[] = rawFinanciamentos.map((f) => ({
                id: f.id,
                nome: f.nome,
                overhead: String(f.overhead),
                taxa_financiamento: String(f.taxa_financiamento),
                valor_eti: String(f.valor_eti),
              }));

              const tipoNormalizado = tipoFinanciamento.trim().toLowerCase();

              const financiamentoExistente = financiamentos.find(
                (f) => f.nome.trim().toLowerCase() === tipoNormalizado
              );

              if (financiamentoExistente) {
                dispatch({
                  type: "UPDATE_PROJETO",
                  data: {
                    financiamentoId: financiamentoExistente.id,
                  },
                });
                console.log(`[Importação] Financiamento '${financiamentoExistente.nome}' encontrado e aplicado.`);
                toast.success(`Financiamento "${financiamentoExistente.nome}" aplicado`);
              } else if (tipoFinanciamento) {
                 console.log(`[Importação] Financiamento '${tipoFinanciamento}' não encontrado. Abrindo modal para criação.`);
                 setDadosFinanciamento({
                  nome: tipoFinanciamento,
                  overhead,
                  taxa_financiamento: taxaFinanciamento,
                  valor_eti: valorEti,
                });

                setModalFinanciamentosAberto(true);

                toast.info(`Não existe financiamento do tipo "${tipoFinanciamento}". Por favor, crie um novo.`);
              }
          } catch (error) {
            console.error("[Importação] Erro ao verificar financiamentos existentes:", error);
            toast.error("Erro ao verificar financiamentos existentes.");
          }
        }

        toast.success("Projeto importado com sucesso do Excel!");
        setOpen(false);
      } catch (error) {
        console.error("[Importação] Erro GERAL na importação:", error); 
        toast.error("Ocorreu um erro ao processar o ficheiro Excel.");
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = (error) => {
      console.error("[Importação] Erro ao ler o ficheiro:", error); 
      toast.error("Ocorreu um erro ao ler o ficheiro.");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);

  }, [dispatch, financiamentosData, utilizadoresData, toast]);

  const handleFinanciamentoCriado = useCallback((financiamento: FinanciamentoAPI) => {
    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        financiamentoId: financiamento.id,
        overhead: new Decimal(financiamento.overhead),
        taxa_financiamento: new Decimal(financiamento.taxa_financiamento),
        valor_eti: new Decimal(financiamento.valor_eti),
      },
    });

    setDadosFinanciamento(null);
    setModalFinanciamentosAberto(false);

    toast.success("Financiamento criado e aplicado ao projeto");
  }, [dispatch, toast]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg">
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Importar Projeto a partir de Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-azul/30 p-6">
              <FileSpreadsheet className="mb-3 h-12 w-12 text-azul/70" />

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />

              <Button
                className="mt-2 bg-azul hover:bg-azul/90"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
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
                    A processar...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Ficheiro Excel
                  </span>
                )}
              </Button>
              <p className="mt-2 text-center text-sm text-azul/60">
                Selecione um ficheiro Excel com o formato correto para importar automaticamente os
                dados do projeto
              </p>
            </div>

            <div className="flex items-center justify-center text-sm text-azul/70">
              <ExternalLink className="mr-1 h-4 w-4" />
              <a
                href="/templates/modelo_projeto.xlsx"
                className="underline hover:text-azul"
                download
              >
                Descarregar modelo de exemplo
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {modalFinanciamentosAberto && (
        <GerirFinanciamentosModal
          open={modalFinanciamentosAberto}
          onOpenChange={setModalFinanciamentosAberto}
          dadosPreenchidos={{
            nome: dadosFinanciamento?.nome || "",
            overhead: dadosFinanciamento?.overhead || null,
            taxa_financiamento: dadosFinanciamento?.taxa_financiamento || null,
            valor_eti: dadosFinanciamento?.valor_eti || null,
          }}
          onFinanciamentoCriado={handleFinanciamentoCriado}
        />
      )}
    </>
  );
}