"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ExternalLink, 
  FileSpreadsheet, 
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from "xlsx";
import { Decimal } from "decimal.js";
import {
  Rubrica,
  type Material as PrismaMaterial,
  type Workpackage as PrismaWorkpackage,
} from "@prisma/client";
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
};

interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
  materiais: MaterialImportacao[];
  dataInicio: Date | null;
  dataFim: Date | null;
}

// Funções Utilitárias
function mapearRubrica(rubricaExcel: string): Rubrica {
  const mapeamento: Record<string, Rubrica> = {
    Materiais: "MATERIAIS",
    "Serviços Terceiros": "SERVICOS_TERCEIROS", 
    "Outros Serviços": "OUTROS_SERVICOS",
    "Deslocações e Estadas": "DESLOCACAO_ESTADIAS",
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

function extrairDadosFinanciamento(
  dadosBudget: any[][]
): {
  tipoFinanciamento: string;
  taxaFinanciamento: number | null;
  overhead: number | null;
  valorEti: number | null;
} {
  let tipoFinanciamento = "";
  let taxaFinanciamento: number | null = null;
  let overhead: number | null = null;
  let valorEti: number | null = null;

  for (const linha of dadosBudget) {
    if (linha && linha.length >= 8) {
      if (linha[6] === "Tipo de projeto " && linha[7]) {
        tipoFinanciamento = linha[7];
      } else if (
        linha[6] === "Taxa de financiamento" &&
        typeof linha[7] === "number"
      ) {
        taxaFinanciamento = linha[7] * 100; // Converter para percentagem
      } else if (
        linha[6] === "Custos indiretos" &&
        typeof linha[7] === "number"
      ) {
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

    if (
      row[4] &&
      typeof row[4] === "string" &&
      row[5] &&
      typeof row[5] === "number"
    ) {
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
      });
      
      console.log(`📝 Material encontrado: ${despesa} (${atividade}) - ${custoUnitario}€ x ${unidades} = ${custoUnitario * unidades}€`);
    }
  }
  
  console.log(`📝 Total de materiais encontrados: ${materiais.length}`);
  
  return materiais;
}

function extrairUtilizadores(apiResponse: any): any[] {
  if (!apiResponse) return [];
  
  if (
    apiResponse.result?.data?.json?.items &&
    Array.isArray(apiResponse.result.data.json.items)
  ) {
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

  let dataInicioProjeto: Date | null = null;
  let dataFimProjeto: Date | null = null;

  const colunasDatas: { coluna: number; mes: number; ano: number }[] = [];
  
  // Extrair datas das colunas
  for (let i = 6; i < linhaMeses.length; i++) {
    if (
      linhaAnos[i] &&
      typeof linhaAnos[i] === "number" &&
      linhaMeses[i] &&
      typeof linhaMeses[i] === "number"
    ) {
      const { mes, ano } = excelDateToJS(linhaMeses[i]);
      
      if (ano === linhaAnos[i]) {
        colunasDatas.push({ coluna: i, mes, ano });

        if (
          !dataInicioProjeto ||
          new Date(ano, mes - 1, 1) < dataInicioProjeto
        ) {
          dataInicioProjeto = new Date(ano, mes - 1, 1);
        }
        
        if (
          !dataFimProjeto ||
          new Date(ano, mes, 0) > dataFimProjeto
        ) {
          dataFimProjeto = new Date(ano, mes, 0);
        }
      }
    }
  }
  
  // Processar linhas para encontrar workpackages e recursos
  for (let i = 6; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Verificar se é um workpackage
    if (
      row[1] &&
      typeof row[1] === "string" &&
      row[1].match(/^A\d+$/) &&
      row[2]
    ) {
      wpAtual = {
        codigo: row[1],
        nome: row[2],
        recursos: [],
        materiais: [],
        dataInicio: null,
        dataFim: null,
      };
      wps.push(wpAtual);
      
      // Log de workpackage encontrado
      console.log(`📦 WP: ${wpAtual.codigo} - ${wpAtual.nome}`);
      
      // Extrair datas do workpackage
      if (typeof row[4] === "number" && typeof row[5] === "number") {
        const planStart = row[4];
        const planDuration = row[5];
        
        if (planStart > 0 && planDuration > 0 && dataInicioProjeto) {
          const dataInicio = new Date(dataInicioProjeto);
          dataInicio.setMonth(dataInicioProjeto.getMonth() + (planStart - 1));
          
          const dataFim = new Date(dataInicio);
          dataFim.setMonth(dataInicio.getMonth() + (planDuration - 1));
          dataFim.setDate(
            new Date(dataFim.getFullYear(), dataFim.getMonth() + 1, 0).getDate()
          );
          
          wpAtual.dataInicio = dataInicio;
          wpAtual.dataFim = dataFim;
          
          // Log de datas do workpackage
          console.log(`   📅 Período: ${dataInicio.toLocaleDateString()} até ${dataFim.toLocaleDateString()}`);
        }
      }
    } 
    // Verificar se é um recurso/utilizador
    else if (wpAtual && row[3] && typeof row[3] === "string" && !row[1]) {
      const nomeRecurso = row[3];
      
      // Encontrar utilizador correspondente
      const utilizador = utilizadores.find(
        (u) =>
        u.name?.toLowerCase() === nomeRecurso.toLowerCase() ||
        u.name?.toLowerCase().includes(nomeRecurso.toLowerCase()) ||
        nomeRecurso.toLowerCase().includes(u.name?.toLowerCase())
      );
      
      const recurso: Recurso = {
        nome: nomeRecurso,
        userId: utilizador?.id || null,
        alocacoes: [],
      };
      
      // Extrair alocações do recurso
      for (const colData of colunasDatas) {
        const valor = row[colData.coluna];
        
        if (
          valor &&
          typeof valor === "number" &&
          !isNaN(valor) &&
          valor > 0 &&
          valor <= 1
        ) {
          recurso.alocacoes.push({
            mes: colData.mes,
            ano: colData.ano,
            percentagem: valor * 100,
          });
        }
      }

      if (recurso.alocacoes.length > 0) {
        wpAtual.recursos.push(recurso);
        
        // Log do utilizador
        console.log(`   👤 ${nomeRecurso}${utilizador ? ` (ID: ${utilizador.id})` : ' (não encontrado)'} - ${recurso.alocacoes.length} alocações:`);
        
        // Log de todas as alocações em ordem cronológica
        recurso.alocacoes
          .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
          .forEach(a => {
            console.log(`      📊 ${a.mes}/${a.ano}: ${a.percentagem.toFixed(1)}%`);
          });
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
  
  let materiaisAtribuidos = 0;
  let materiaisPadrão = 0;
  
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
      materiaisAtribuidos++;
      console.log(`✅ Material atribuído: "${material.nome}" ao workpackage "${wpMatch.nome}"`);
    } else if (workpackages.length > 0 && workpackages[0]) {
      workpackages[0].materiais.push(material);
      materiaisPadrão++;
      console.log(`⚠️ Material sem correspondência: "${material.nome}" atribuído ao primeiro workpackage`);
    }
  });
  
  console.log(`📊 Materiais atribuídos: ${materiaisAtribuidos} diretamente, ${materiaisPadrão} ao workpackage padrão`);
  
  return workpackages;
}

// Componente Principal
export default function ImportarProjetoButton() {
  const router = useRouter();
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

  // Adicionar o hook aqui dentro do componente
  const { data: financiamentosData } = api.financiamento.findAll.useQuery({ limit: 100 });

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      // Carregar utilizadores
      const response = await fetch("/api/trpc/utilizador.findAll");
      const responseData = await response.json();
      const utilizadores = extrairUtilizadores(responseData);
      
      console.log(`👥 Utilizadores carregados: ${utilizadores.length}`);
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
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

          // Extrair todos os dados primeiro
          if (sheetsData["HOME"]) {
            const dadosProjeto = extrairDadosProjeto(sheetsData["HOME"]);
            nomeProjeto = dadosProjeto.nomeProjeto;
          }

          if (sheetsData["BUDGET"]) {
            const dadosFinanciamento =
              extrairDadosFinanciamento(sheetsData["BUDGET"]);
            tipoFinanciamento = dadosFinanciamento.tipoFinanciamento;
            taxaFinanciamento = dadosFinanciamento.taxaFinanciamento;
            overhead = dadosFinanciamento.overhead;
            valorEti = dadosFinanciamento.valorEti;
          }

          if (sheetsData["RH_Budget_SUBM"]) {
            if (!valorEti) {
              valorEti = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
            }

            const resultado = extrairDadosRH(
              sheetsData["RH_Budget_SUBM"],
              utilizadores
            );
            wps = resultado.workpackages;
            dataInicioProjeto = resultado.dataInicioProjeto;
            dataFimProjeto = resultado.dataFimProjeto;
          }
          
          if (sheetsData["Outros_Budget"]) {
            materiais = extrairMateriais(sheetsData["Outros_Budget"]);
          }
          
          if (wps.length > 0 && materiais.length > 0) {
            wps = atribuirMateriaisAosWorkpackages(wps, materiais);
          }

          // Resetar o estado para iniciar com dados limpos
          dispatch({ type: "RESET" });
          
          // Atualizar os dados do projeto de uma só vez
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

          // Adicionar workpackages, recursos e materiais
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
                projetoId: "seu-projeto-id-aqui",
              },
            });
            
            // Adicionar recursos e alocações
            console.log(`📊 Processando recursos para: ${wp.nome} (${wp.recursos.length} recursos)`);
            
            wp.recursos.forEach((recurso) => {
              if (!recurso.userId) return;
              
              // Adicionar todas as alocações do recurso
              recurso.alocacoes.forEach(alocacao => {
                dispatch({
                  type: "ADD_ALOCACAO",
                  workpackageId: wpId,
                  alocacao: {
                    userId: recurso.userId!,
                    mes: alocacao.mes,
                    ano: alocacao.ano,
                    ocupacao: new Decimal(alocacao.percentagem / 100),
                    workpackageId: wpId,
                  },
                });
              });
            });
            
            // Adicionar materiais
            console.log(`📝 Processando materiais para: ${wp.nome} (${wp.materiais.length} materiais)`);
            
            wp.materiais.forEach((material) => {
              dispatch({
                type: "ADD_MATERIAL",
                workpackageId: wpId,
                material: {
                  id: Math.floor(Math.random() * 1000000),
                  nome: material.nome,
                  preco: new Decimal(material.preco),
                  quantidade: material.quantidade,
                  ano_utilizacao: material.ano_utilizacao,
                  rubrica: material.rubrica,
                  workpackageId: wpId,
                },
              });
            });
          });
          
          // Verificar o financiamento
          if (tipoFinanciamento) {
            try {
              const financiamentos = financiamentosData?.items || [];
              
              const tipoNormalizado = tipoFinanciamento.trim().toLowerCase();
              
              const financiamentoExistente = financiamentos.find(
                (f: {nome: string, id: number, overhead: Decimal, taxa_financiamento: Decimal, valor_eti: Decimal}) => 
                  f.nome.trim().toLowerCase() === tipoNormalizado
              );
              
              if (financiamentoExistente) {
                dispatch({
                  type: "UPDATE_PROJETO",
                  data: {
                    financiamentoId: financiamentoExistente.id,
                    overhead: financiamentoExistente.overhead,
                    taxa_financiamento: financiamentoExistente.taxa_financiamento,
                    valor_eti: financiamentoExistente.valor_eti
                  }
                });
                
                toast.success(`Financiamento "${tipoFinanciamento}" encontrado e aplicado ao projeto.`);
              } else {
                setDadosFinanciamento({
                  nome: tipoFinanciamento,
                  overhead: overhead,
                  taxa_financiamento: taxaFinanciamento,
                  valor_eti: valorEti
                });
                
                setOpen(false);
                setModalFinanciamentosAberto(true);
                
                toast.error(`Atenção: O financiamento "${tipoFinanciamento}" não foi encontrado no sistema.`, {
                  duration: 10000,
                  description: "Por favor, verifique os dados e crie um novo financiamento com as informações fornecidas.",
                  action: {
                    label: "Confirmar",
                    onClick: () => toast.dismiss()
                  }
                });
              }
            } catch (error) {
              toast.error("Erro ao verificar financiamentos existentes.");
            }
          }

          // Registar informações gerais
          console.log(`📋 Projeto: "${nomeProjeto}" - Período: ${dataInicioProjeto?.toLocaleDateString()} até ${dataFimProjeto?.toLocaleDateString()}`);
          console.log(`📋 Financiamento: ${tipoFinanciamento || "Não definido"} (ETI: ${valorEti || 0}€, Overhead: ${overhead || 0}%, Taxa: ${taxaFinanciamento || 0}%)`);
          console.log(`📋 Total: ${wps.length} workpackages, ${materiais.length} materiais`);

          setOpen(false);
        } catch (error) {
          console.error("Erro na importação:", error);
          toast.error("Ocorreu um erro ao processar o ficheiro Excel.");
          setIsLoading(false);
        }
      };

      reader.onerror = (error) => {
        toast.error("Ocorreu um erro ao ler o ficheiro.");
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro na importação:", error);
      toast.error("Ocorreu um erro ao buscar utilizadores.");
      setIsLoading(false);
    }
  };

  const handleFinanciamentoCriado = (financiamento: any) => {
    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        financiamentoId: financiamento.id,
        overhead: financiamento.overhead,
        taxa_financiamento: financiamento.taxa_financiamento,
        valor_eti: financiamento.valor_eti,
      },
    });
    
    setDadosFinanciamento(null);
    setModalFinanciamentosAberto(false);
    
    toast.success("Financiamento criado e aplicado ao projeto");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            className="bg-azul hover:bg-azul/90 text-white font-medium"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              Importar Projeto a partir de Excel
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-azul/30 rounded-lg">
              <FileSpreadsheet className="h-12 w-12 text-azul/70 mb-3" />
              
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              
              <Button 
                className="bg-azul hover:bg-azul/90 mt-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Ficheiro Excel
                  </span>
                )}
              </Button>
              <p className="mt-2 text-sm text-azul/60 text-center">
                Selecione um ficheiro Excel com o formato correto para importar
                automaticamente os dados do projeto
              </p>
            </div>

            <div className="text-sm text-azul/70 flex items-center justify-center">
              <ExternalLink className="h-4 w-4 mr-1" />
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
      
      {/* Garante que dadosPreenchidos não é undefined */}
      {modalFinanciamentosAberto && (
      <GerirFinanciamentosModal 
        open={modalFinanciamentosAberto} 
        onOpenChange={setModalFinanciamentosAberto}
          dadosPreenchidos={{
            nome: dadosFinanciamento?.nome || "",
            overhead: dadosFinanciamento?.overhead || null,
            taxa_financiamento: dadosFinanciamento?.taxa_financiamento || null,
            valor_eti: dadosFinanciamento?.valor_eti || null
          }}
        onFinanciamentoCriado={handleFinanciamentoCriado}
      />
      )}
    </>
  );
}
