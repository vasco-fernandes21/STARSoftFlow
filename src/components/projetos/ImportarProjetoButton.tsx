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
import { Rubrica, type Material as PrismaMaterial, type Workpackage as PrismaWorkpackage } from "@prisma/client";
import { toast } from "sonner";
import { generateUUID } from "@/server/api/utils/token";
import { api } from "@/trpc/react";

// Interfaces necessárias - agora baseadas nos tipos do Prisma
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

// Usar o tipo do Prisma como base e estender conforme necessário
type MaterialImportacao = Pick<PrismaMaterial, 'nome' | 'preco' | 'quantidade' | 'ano_utilizacao' | 'rubrica'> & {
  workpackageNome: string;
};

// Usar o tipo do Prisma como base e estender conforme necessário
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

// Função auxiliar para extrair utilizadores da resposta da API
function extrairUtilizadores(apiResponse: any): any[] {
  if (!apiResponse) return [];
  
  // Novo formato aninhado
  if (apiResponse.result?.data?.json?.items && Array.isArray(apiResponse.result.data.json.items)) {
    return apiResponse.result.data.json.items;
  }
  
  // Formato direto
  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }
  
  // Compatibilidade com o formato json aninhado
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

// Modificar a função extrairDadosRH para melhor deteção de workpackages
function extrairDadosRH(data: any[][], utilizadores: any[]): { workpackages: WorkpackageSimples[], dataInicioProjeto: Date | null, dataFimProjeto: Date | null } {
  const wps: WorkpackageSimples[] = [];
  let wpAtual: WorkpackageSimples | null = null;

  console.log("Utilizadores disponíveis:", utilizadores.map(u => `${u.name} (ID: ${u.id})`));

  // Identificar as linhas de cabeçalho (anos e meses)
  const linhaAnos = data[3] || [];
  const linhaMeses = data[4] || [];
  const linhaColunas = data[5] || []; // Linha com os números das colunas (1, 2, 3, etc.)

  // Determinar a primeira e última data diretamente dos cabeçalhos
  let dataInicioProjeto: Date | null = null;
  let dataFimProjeto: Date | null = null;

  // Mapear as colunas de alocação
  const colunasDatas: { coluna: number; mes: number; ano: number }[] = [];
  
  // Começar da coluna 6 (índice 6) que é onde começam os dados de alocação
  for (let i = 6; i < linhaMeses.length; i++) {
    if (linhaAnos[i] && typeof linhaAnos[i] === 'number' && 
        linhaMeses[i] && typeof linhaMeses[i] === 'number') {
      
      // Converter o valor do Excel para data
      const { mes, ano } = excelDateToJS(linhaMeses[i]);
      
      // Verificar se o ano corresponde ao cabeçalho
      if (ano === linhaAnos[i]) {
        colunasDatas.push({ 
          coluna: i, 
          mes, 
          ano 
        });
        
        // Atualizar datas do projeto
        if (!dataInicioProjeto || (new Date(ano, mes - 1, 1) < dataInicioProjeto)) {
          dataInicioProjeto = new Date(ano, mes - 1, 1);
        }
        
        if (!dataFimProjeto || (new Date(ano, mes, 0) > dataFimProjeto)) {
          dataFimProjeto = new Date(ano, mes, 0);
        }
      }
    }
  }
  
  console.log("Colunas de datas mapeadas:", colunasDatas.map(d => `Coluna ${d.coluna}: ${d.mes}/${d.ano}`));

  // Processar as linhas de dados (a partir da linha 7)
  for (let i = 6; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Verificar se é uma linha de workpackage (tem código na coluna 1)
    if (row[1] && typeof row[1] === 'string' && row[1].match(/^A\d+$/) && row[2]) {
      console.log("Encontrado workpackage:", row[1], row[2]);
      wpAtual = {
        codigo: row[1],
        nome: row[2],
        recursos: [],
        materiais: [],
        dataInicio: null,
        dataFim: null
      };
      wps.push(wpAtual);
      
      // Extrair datas do workpackage da linha do workpackage
      if (typeof row[4] === 'number' && typeof row[5] === 'number') {
        const planStart = row[4];
        const planDuration = row[5];
        
        if (planStart > 0 && planDuration > 0 && dataInicioProjeto) {
          // Calcular data de início baseada no PLAN START
          const dataInicio = new Date(dataInicioProjeto);
          dataInicio.setMonth(dataInicioProjeto.getMonth() + (planStart - 1));
          
          // Calcular data de fim baseada na duração
          const dataFim = new Date(dataInicio);
          dataFim.setMonth(dataInicio.getMonth() + (planDuration - 1));
          dataFim.setDate(new Date(dataFim.getFullYear(), dataFim.getMonth() + 1, 0).getDate()); // Último dia do mês
          
          wpAtual.dataInicio = dataInicio;
          wpAtual.dataFim = dataFim;
          
          console.log(`Datas do workpackage ${wpAtual.codigo}: Início ${dataInicio.toLocaleDateString('pt-PT')}, Fim ${dataFim.toLocaleDateString('pt-PT')}`);
        }
      }
    }
    // Verificar se é uma linha de recurso (tem nome na coluna 3 e não tem código na coluna 1)
    else if (wpAtual && row[3] && typeof row[3] === 'string' && !row[1]) {
      const nomeRecurso = row[3];
      console.log(`Processando recurso para ${wpAtual.codigo}: ${nomeRecurso}`);
      
      // Encontrar o utilizador correspondente
      const utilizador = utilizadores.find(u => 
        u.name?.toLowerCase() === nomeRecurso.toLowerCase() ||
        u.name?.toLowerCase().includes(nomeRecurso.toLowerCase()) ||
        nomeRecurso.toLowerCase().includes(u.name?.toLowerCase())
      );
      
      if (utilizador) {
        console.log(`Associação encontrada: "${nomeRecurso}" -> "${utilizador.name}" (ID: ${utilizador.id})`);
      } else {
        console.log(`Nenhuma associação encontrada para "${nomeRecurso}"`);
      }
      
      const recurso: Recurso = {
        nome: nomeRecurso,
        userId: utilizador?.id || null,
        alocacoes: []
      };
      
      // Extrair alocações diretamente das colunas mapeadas
      for (const colData of colunasDatas) {
        const valor = row[colData.coluna];
        
        // Verificar se o valor é um número válido entre 0 e 1 (percentagem)
        if (valor && typeof valor === 'number' && !isNaN(valor) && valor > 0 && valor <= 1) {
          recurso.alocacoes.push({
            mes: colData.mes,
            ano: colData.ano,
            percentagem: valor * 100 // Converter para percentagem (0-100)
          });
          
          console.log(`Alocação encontrada para ${nomeRecurso}: ${colData.mes}/${colData.ano} = ${valor * 100}%`);
        }
      }
      
      // Adicionar o recurso ao workpackage atual se tiver alocações
      if (recurso.alocacoes.length > 0) {
        wpAtual.recursos.push(recurso);
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
  materiais: MaterialImportacao[]
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      // Buscar todos os utilizadores usando fetch
      const response = await fetch('/api/trpc/utilizador.getAll');
      const responseData = await response.json();
      const utilizadores = extrairUtilizadores(responseData);
      
      console.log("Utilizadores carregados:", utilizadores.length);
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetsData = converterExcelParaJson(workbook);
          
          let wps: WorkpackageSimples[] = [];
          let materiais: MaterialImportacao[] = [];
          let dataInicioProjeto: Date | null = null;
          let dataFimProjeto: Date | null = null;
          
          if (sheetsData['RH_Budget_SUBM']) {
            const resultado = extrairDadosRH(sheetsData['RH_Budget_SUBM'], utilizadores);
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
              // Usar o ID do utilizador encontrado ou um ID padrão se não encontrado
              const userId = recurso.userId || "1";
              console.log(`Adicionando recurso: ${recurso.nome} (ID: ${userId}) ao WP: ${wp.nome}`);
              
              recurso.alocacoes.forEach(alocacao => {
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
                console.log(`  Alocação: ${alocacao.mes}/${alocacao.ano} - ${alocacao.percentagem}%`);
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
    } catch (error) {
      console.error("Erro ao buscar utilizadores:", error);
      toast.error("Ocorreu um erro ao buscar utilizadores.");
      setIsLoading(false);
    }
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

