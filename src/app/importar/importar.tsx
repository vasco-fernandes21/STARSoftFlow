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
  Plus, 
  Upload 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from 'xlsx';
import { Decimal } from "decimal.js";
import { Rubrica } from "@prisma/client";
import { toast } from "sonner";

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
}

// Função para mapear a rubrica do Excel para o enum Rubrica
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

export default function ImportarProjetoButton() {
  const router = useRouter();
  const { dispatch } = useProjetoForm();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para extrair materiais do Excel
  const extrairMateriais = (data: any[][]): Material[] => {
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
  };

  // Função para extrair dados RH
  const extrairDadosRH = (data: any[][]): WorkpackageSimples[] => {
    const wps: WorkpackageSimples[] = [];
    let wpAtual: WorkpackageSimples | null = null;

    // Extrair anos e meses do cabeçalho
    const anos = data[3]?.slice(6) || [];
    const meses = data[4]?.slice(6) || [];

    // Função para converter código Excel para data
    const excelDateToJS = (excelDate: number) => {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return {
        mes: date.getMonth() + 1,
        ano: date.getFullYear()
      };
    };

    for (let i = 7; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      if (row[1]?.match(/^A\d+$/)) {
        console.log("Encontrado workpackage:", row[1], row[2]);
        wpAtual = {
          codigo: row[1],
          nome: row[2] || '',
          recursos: [],
          materiais: []
        };
        wps.push(wpAtual);
      }
      else if (!row[1] && row[2]?.startsWith("A1 -") && !wpAtual) {
        console.log("Encontrado workpackage A1 implícito");
        wpAtual = {
          codigo: "A1",
          nome: row[2],
          recursos: [],
          materiais: []
        };
        wps.push(wpAtual);
      }
      else if (wpAtual && row[3]) {
        console.log("Processando recurso:", row[3]);
        const recurso: Recurso = {
          nome: row[3],
          alocacoes: []
        };

        for (let j = 6; j < 42; j++) {
          const valor = row[j];
          if (valor && typeof valor === 'number' && !isNaN(valor) && valor > 0 && valor < 2) {
            const dataExcel = meses[j - 6];
            const { mes, ano } = excelDateToJS(dataExcel);
            
            recurso.alocacoes.push({
              mes,
              ano,
              percentagem: valor * 100
            });
          }
        }

        if (recurso.alocacoes.length > 0) {
          wpAtual.recursos.push(recurso);
        }
      }
    }

    return wps;
  };

  // Função para atribuir materiais aos workpackages
  const atribuirMateriaisAosWorkpackages = (
    workpackages: WorkpackageSimples[],
    materiais: Material[]
  ): WorkpackageSimples[] => {
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
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetsData: {[key: string]: any[][]} = {};
        const names = workbook.SheetNames;
        
        names.forEach(name => {
          const sheet = workbook.Sheets[name];
          sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        });
        
        let wps: WorkpackageSimples[] = [];
        let materiais: Material[] = [];
        
        if (sheetsData['RH_Budget_SUBM']) {
          wps = extrairDadosRH(sheetsData['RH_Budget_SUBM']);
        }
        
        if (sheetsData['Outros_Budget']) {
          materiais = extrairMateriais(sheetsData['Outros_Budget']);
        }
        
        if (wps.length > 0 && materiais.length > 0) {
          wps = atribuirMateriaisAosWorkpackages(wps, materiais);
        }
        
        // Resetar o estado atual
        dispatch({ type: "RESET" });
        
        // Importar workpackages e recursos
        wps.forEach(wp => {
          const wpId = crypto.randomUUID();
          
          dispatch({
            type: "ADD_WORKPACKAGE",
            workpackage: {
              id: wpId,
              nome: wp.nome,
              descricao: null,
              inicio: null,
              fim: null,
              estado: false,
              tarefas: [],
              materiais: [],
              recursos: []
            }
          });
          
          // Importar recursos
          wp.recursos.forEach(recurso => {
            recurso.alocacoes.forEach(alocacao => {
              // Este ID precisa ser substituído por um ID real em produção
              const userId = "1"; 
              
              dispatch({
                type: "ADD_ALOCACAO",
                workpackageId: wpId,
                alocacao: {
                  userId,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                  ocupacao: new Decimal(alocacao.percentagem / 100)
                }
              });
            });
          });
          
          // Importar materiais
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
        
        // Redirecionar para a página de criação de projeto
        router.push('/projetos/criar');
        
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
            className="bg-azul hover:bg-azul/90 text-white font-medium shadow-sm hover:shadow"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Importar Projeto
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
