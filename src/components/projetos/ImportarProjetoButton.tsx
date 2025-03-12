"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  ExternalLink, 
  FileSpreadsheet, 
  Upload 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from 'xlsx';
import { Decimal } from "decimal.js";
import { Rubrica } from "@prisma/client";
import { toast } from "sonner";
import { generateUUID } from "@/server/api/utils/token";

// Interfaces necessárias
interface Alocacao {
  mes: number;
  ano: number;
  percentagem: number;
}

interface Recurso {
  nome: string;
  alocacoes: Alocacao[];
}

interface Material {
  nome: string;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
  workpackageNome: string;
}

interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
  materiais: Material[];
  dataInicio: Date | null;
  dataFim: Date | null;
}

// Funções Utilitárias
function mapearRubrica(rubricaExcel: string): Rubrica {
  const mapeamento: Record<string, Rubrica> = {
    "Materiais": "MATERIAIS",
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
    ano: date.getFullYear()
  };
}

// Funções de Conversão de Excel para JSON
function converterExcelParaJson(workbook: XLSX.WorkBook): {[key: string]: any[][]} {
  const sheetsData: {[key: string]: any[][]} = {};
  workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    if (sheet) {
      sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }
  });
  return sheetsData;
}

// Funções de Processamento de Dados
function extrairMateriais(data: any[][]): Material[] {
  const materiais: Material[] = [];
  
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
    
    if (typeof custoUnitario === 'number' && typeof unidades === 'number') {
      materiais.push({
        nome: despesa,
        preco: custoUnitario,
        quantidade: unidades,
        ano_utilizacao: typeof ano === 'number' ? ano : new Date().getFullYear(),
        rubrica: mapearRubrica(rubrica),
        workpackageNome: atividade
      });
    }
  }
  
  return materiais;
}

function extrairDadosRH(data: any[][]): { workpackages: WorkpackageSimples[], dataInicioProjeto: Date | null, dataFimProjeto: Date | null } {
  const wps: WorkpackageSimples[] = [];
  let wpAtual: WorkpackageSimples | null = null;

  const anos = data[3]?.slice(6) || [];
  const meses = data[4]?.slice(6) || [];

  // Determinar a primeira e última data diretamente dos cabeçalhos
  let dataInicioProjeto: Date | null = null;
  let dataFimProjeto: Date | null = null;

  // Encontrar a primeira data válida
  for (let i = 0; i < meses.length; i++) {
    if (meses[i] && typeof meses[i] === 'number') {
      const { mes, ano } = excelDateToJS(meses[i]);
      dataInicioProjeto = new Date(ano, mes - 1, 1);
      console.log(`Primeira data do projeto (do cabeçalho): ${mes}/${ano}`);
      break;
    }
  }

  // Encontrar a última data válida
  for (let i = meses.length - 1; i >= 0; i--) {
    if (meses[i] && typeof meses[i] === 'number') {
      const { mes, ano } = excelDateToJS(meses[i]);
      // Último dia do mês
      dataFimProjeto = new Date(ano, mes, 0);
      console.log(`Última data do projeto (do cabeçalho): ${mes}/${ano}`);
      break;
    }
  }

  // Converter os valores de meses do Excel para objetos de data
  const datas: { mes: number; ano: number; indice: number }[] = [];
  for (let i = 0; i < meses.length; i++) {
    if (meses[i] && typeof meses[i] === 'number') {
      const { mes, ano } = excelDateToJS(meses[i]);
      datas.push({ mes, ano, indice: i + 6 }); // +6 porque os dados começam na coluna 6
    }
  }

  // Ordenar as datas cronologicamente
  datas.sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });

  console.log("Datas ordenadas:", datas.map(d => `${d.mes}/${d.ano} (índice ${d.indice})`));

  for (let i = 7; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    if (row[1]?.match(/^A\d+$/)) {
      console.log("Encontrado workpackage:", row[1], row[2]);
      wpAtual = {
        codigo: row[1],
        nome: row[2] || '',
        recursos: [],
        materiais: [],
        dataInicio: null,
        dataFim: null
      };
      wps.push(wpAtual);
    }
    else if (!row[1] && row[2]?.startsWith("A1 -") && !wpAtual) {
      console.log("Encontrado workpackage A1 implícito");
      wpAtual = {
        codigo: "A1",
        nome: row[2],
        recursos: [],
        materiais: [],
        dataInicio: null,
        dataFim: null
      };
      wps.push(wpAtual);
    }
    else if (wpAtual && row[3]) {
      console.log("Processando recurso:", row[3]);
      const recurso: Recurso = {
        nome: row[3],
        alocacoes: []
      };

      let dataInicio: Date | null = null;
      
      // Verificar cada coluna de alocação
      for (const data of datas) {
        const valor = row[data.indice];
        if (valor && typeof valor === 'number' && !isNaN(valor) && valor > 0 && valor < 2) {
          // Se encontramos uma alocação válida
          if (!dataInicio) {
            dataInicio = new Date(data.ano, data.mes - 1, 1); // Primeiro dia do mês
            console.log(`Primeira alocação encontrada para ${row[3]}: ${data.mes}/${data.ano}`);
          }

          recurso.alocacoes.push({
            mes: data.mes,
            ano: data.ano,
            percentagem: valor * 100
          });
        }
      }

      // Calcular a data de fim com base na duração do plano
      let dataFim: Date | null = null;
      if (dataInicio && typeof row[5] === 'number' && row[5] > 0) {
        const duracao = row[5] - 1; // PLAN DURATION - 1
        dataFim = new Date(dataInicio);
        dataFim.setMonth(dataInicio.getMonth() + duracao);
        dataFim.setDate(new Date(dataFim.getFullYear(), dataFim.getMonth() + 1, 0).getDate()); // Último dia do mês
      }

      if (recurso.alocacoes.length > 0) {
        wpAtual.recursos.push(recurso);
        
        // Atualizar as datas do workpackage
        if (!wpAtual.dataInicio || (dataInicio && dataInicio < wpAtual.dataInicio)) {
          wpAtual.dataInicio = dataInicio;
        }
        
        if (!wpAtual.dataFim || (dataFim && dataFim > wpAtual.dataFim)) {
          wpAtual.dataFim = dataFim;
        }
        
        console.log(`Data de Início WP: ${wpAtual.dataInicio?.toLocaleDateString('pt-PT')}, Data de Fim WP: ${wpAtual.dataFim?.toLocaleDateString('pt-PT')}`);
      }
    }
  }

  // Verificação final para garantir que nenhum workpackage tem datas inválidas
  for (const wp of wps) {
    if (!wp.dataInicio || wp.dataInicio.getFullYear() > 2100) {
      console.warn(`Workpackage ${wp.codigo} tem data de início inválida: ${wp.dataInicio}`);
      wp.dataInicio = dataInicioProjeto;
    }
    
    if (!wp.dataFim || wp.dataFim.getFullYear() > 2100) {
      console.warn(`Workpackage ${wp.codigo} tem data de fim inválida: ${wp.dataFim}`);
      wp.dataFim = dataFimProjeto;
    }
  }

  return { workpackages: wps, dataInicioProjeto, dataFimProjeto };
}

function atribuirMateriaisAosWorkpackages(
  workpackages: WorkpackageSimples[],
  materiais: Material[]
): WorkpackageSimples[] {
  const wpMap = new Map<string, WorkpackageSimples>();
  workpackages.forEach(wp => {
    wpMap.set(wp.nome, wp);
    
    const wpCodigo = wp.nome.split(' - ')[0]?.trim();
    if (wpCodigo) {
      wpMap.set(wpCodigo, wp);
    }
  });
  
  materiais.forEach(material => {
    let wpMatch = wpMap.get(material.workpackageNome);
    
    if (!wpMatch) {
      const codigoMatch = material.workpackageNome.match(/^A\d+/);
      if (codigoMatch) {
        wpMatch = workpackages.find(wp => wp.codigo === codigoMatch[0]) || null;
      }
    }
    
    if (wpMatch) {
      wpMatch.materiais.push(material);
    } else {
      if (workpackages.length > 0) {
        workpackages[0].materiais.push(material);
      }
    }
  });
  
  return workpackages;
}

// Função Principal
export default function ImportarProjetoButton() {
  const router = useRouter();
  const { dispatch } = useProjetoForm();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetsData = converterExcelParaJson(workbook);
        
        let wps: WorkpackageSimples[] = [];
        let materiais: Material[] = [];
        let dataInicioProjeto: Date | null = null;
        let dataFimProjeto: Date | null = null;
        
        if (sheetsData['RH_Budget_SUBM']) {
          const resultado = extrairDadosRH(sheetsData['RH_Budget_SUBM']);
          wps = resultado.workpackages;
          dataInicioProjeto = resultado.dataInicioProjeto;
          dataFimProjeto = resultado.dataFimProjeto;
        }
        
        if (sheetsData['Outros_Budget']) {
          materiais = extrairMateriais(sheetsData['Outros_Budget']);
        }
        
        if (wps.length > 0 && materiais.length > 0) {
          wps = atribuirMateriaisAosWorkpackages(wps, materiais);
        }
        
        console.log(`Projeto: Início ${dataInicioProjeto?.toLocaleDateString('pt-PT')}, Fim ${dataFimProjeto?.toLocaleDateString('pt-PT')}`);
        
        // Atualizar o estado do projeto com as datas
        dispatch({ type: "RESET" });
        
        if (dataInicioProjeto && dataFimProjeto) {
          dispatch({
            type: "UPDATE_PROJETO",
            data: {
              inicio: dataInicioProjeto,
              fim: dataFimProjeto
            }
          });
        }
        
        // Agora, ao adicionar os workpackages, incluir as datas calculadas
        wps.forEach(wp => {
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
              recursos: []
            }
          });
          
          // Adicionar recursos e alocações
          wp.recursos.forEach(recurso => {
            recurso.alocacoes.forEach(alocacao => {
              const userId = "1";
              
              dispatch({
                type: "ADD_ALOCACAO",
                workpackageId: wpId,
                alocacao: {
                  userId,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                  ocupacao: new Decimal(alocacao.percentagem / 100),
                  workpackageId: wpId
                }
              });
            });
          });
          
          // Adicionar materiais
          wp.materiais.forEach(material => {
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
                workpackageId: wpId
              }
            });
          });
        });
        
        toast.success("Dados importados com sucesso!");
        setOpen(false);
        
      } catch (error) {
        console.error("Erro ao processar o ficheiro Excel:", error);
        toast.error("Ocorreu um erro ao processar o ficheiro Excel.");
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = (error) => {
      console.error("Erro ao ler o ficheiro:", error);
      toast.error("Ocorreu um erro ao ler o ficheiro.");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
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
            <DialogTitle className="text-center">Importar Projeto a partir de Excel</DialogTitle>
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
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                Selecione um ficheiro Excel com o formato correto para importar automaticamente os dados do projeto
              </p>
            </div>

            <div className="text-sm text-azul/70 flex items-center justify-center">
              <ExternalLink className="h-4 w-4 mr-1" />
              <a href="/templates/modelo_projeto.xlsx" className="underline hover:text-azul" download>
                Descarregar modelo de exemplo
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
