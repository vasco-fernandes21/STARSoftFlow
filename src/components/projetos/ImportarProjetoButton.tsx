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

  // Função para extrair materiais do Excel - versão melhorada
  const extrairMateriais = (data: any[][]): Material[] => {
    const materiais: Material[] = [];
    console.log("Iniciando extração de materiais de Outros_Budget, linhas totais:", data?.length);
    
    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row[0]) continue;
      
      const despesa = row[0];
      const atividade = row[1];
      const ano = row[3];
      const rubrica = row[4];
      const custoUnitario = row[5];
      const unidades = row[6];
      
      // Log para debug
      console.log(`Linha ${i}: Despesa=${despesa}, Atividade=${atividade}, Custo=${custoUnitario}, Qtd=${unidades}`);
      
      if (!despesa || !atividade) {
        console.log(`Linha ${i} ignorada: Falta despesa ou atividade`);
        continue;
      }
      
      // Converter valores para número, independentemente do formato original
      const precoNumerico = typeof custoUnitario === 'number' ? custoUnitario : 
                          (typeof custoUnitario === 'string' ? parseFloat(custoUnitario) : 0);
      
      const qtdNumerica = typeof unidades === 'number' ? unidades : 
                         (typeof unidades === 'string' ? parseFloat(unidades) : 1);
      
      // Verificar se a conversão resultou em valores válidos
      if (isNaN(precoNumerico) || precoNumerico <= 0) {
        console.log(`Linha ${i} ignorada: Preço inválido (${custoUnitario})`);
        continue;
      }
      
      // Ano de utilização (usar ano atual como default)
      const anoNumerico = typeof ano === 'number' ? ano : 
                        (typeof ano === 'string' ? parseInt(ano) : new Date().getFullYear());
      
      // Mapear rubrica com fallback
      const rubricaMapeada = rubrica ? mapearRubrica(rubrica) : "MATERIAIS";
      
      materiais.push({
        nome: despesa,
        preco: precoNumerico,
        quantidade: qtdNumerica || 1, // usar 1 como quantidade padrão se for 0 ou NaN
        ano_utilizacao: anoNumerico,
        rubrica: rubricaMapeada,
        workpackageNome: atividade
      });
      
      console.log(`Material adicionado: ${despesa} - ${precoNumerico}€ x ${qtdNumerica} (${rubricaMapeada})`);
    }
    
    console.log(`Total de materiais extraídos: ${materiais.length}`);
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

  // Função melhorada para atribuir materiais aos workpackages
  const atribuirMateriaisAosWorkpackages = (
    workpackages: WorkpackageSimples[],
    materiais: Material[]
  ): WorkpackageSimples[] => {
    console.log(`Atribuindo ${materiais.length} materiais a ${workpackages.length} workpackages`);
    
    const wpMap = new Map<string, WorkpackageSimples>();
    
    // Mapear workpackages por nome e código para busca mais eficiente
    workpackages.forEach(wp => {
      // Mapear pelo nome completo
      wpMap.set(wp.nome, wp);
      
      // Mapear pelo código (A1, A2, etc.)
      wpMap.set(wp.codigo, wp);
      
      // Tentar extrair código do nome (A1 - Descrição)
      const wpCodigo = wp.nome.split(' - ')[0]?.trim();
      if (wpCodigo) {
        wpMap.set(wpCodigo, wp);
        
        // Também mapear sem o "A" (apenas o número)
        const codigoNumerico = wpCodigo.replace('A', '');
        wpMap.set(codigoNumerico, wp);
      }
      
      // Inicializar array de materiais se não existir
      if (!wp.materiais) {
        wp.materiais = [];
      }
      
      console.log(`Workpackage mapeado: ${wp.codigo} - ${wp.nome}`);
    });
    
    let atribuidos = 0;
    let fallback = 0;
    
    materiais.forEach(material => {
      console.log(`Tentando atribuir material: ${material.nome} à atividade: ${material.workpackageNome}`);
      
      // Tentativa 1: Procurar pelo nome completo da atividade
      let wpMatch = wpMap.get(material.workpackageNome);
      
      // Tentativa 2: Procurar pelo código (A1, A2, etc.)
      if (!wpMatch) {
        const codigoMatch = material.workpackageNome.match(/^A?\d+/);
        if (codigoMatch) {
          const codigo = codigoMatch[0];
          console.log(`Tentando match por código: ${codigo}`);
          wpMatch = wpMap.get(codigo);
        }
      }
      
      // Tentativa 3: Procurar por correspondência parcial (se o nome do workpackage contém o código da atividade)
      if (!wpMatch) {
        for (const [key, wp] of wpMap.entries()) {
          if (key.includes(material.workpackageNome) || material.workpackageNome.includes(key)) {
            wpMatch = wp;
            console.log(`Match parcial encontrado: ${key}`);
            break;
          }
        }
      }
      
      if (wpMatch) {
        console.log(`Material atribuído ao workpackage: ${wpMatch.codigo}`);
        wpMatch.materiais.push(material);
        atribuidos++;
      } else {
        console.log(`Não foi possível atribuir: ${material.nome} - Usando fallback`);
        
        // Adicionar ao primeiro workpackage como fallback
        if (workpackages.length > 0) {
          workpackages[0].materiais.push(material);
          fallback++;
        }
      }
    });
    
    console.log(`Atribuição concluída: ${atribuidos} atribuídos diretamente, ${fallback} via fallback`);
    
    // Verificar quantidade de materiais por workpackage após atribuição
    workpackages.forEach(wp => {
      console.log(`Workpackage ${wp.codigo} tem ${wp.materiais.length} materiais`);
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
          console.log("Sheet Outros_Budget encontrada");
          materiais = extrairMateriais(sheetsData['Outros_Budget']);
        } else {
          console.warn("Sheet Outros_Budget NÃO encontrada!");
        }
        
        if (wps.length > 0 && materiais.length > 0) {
          console.log(`Atribuindo ${materiais.length} materiais a ${wps.length} workpackages`);
          wps = atribuirMateriaisAosWorkpackages(wps, materiais);
        }
        
        // Resetar o estado atual
        dispatch({ type: "RESET" });
        
        // Importar workpackages e recursos
        wps.forEach(wp => {
          const wpId = generateUUID();
          
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
          if (wp.materiais && wp.materiais.length > 0) {
            console.log(`Importando ${wp.materiais.length} materiais para workpackage ${wp.nome}`);
            
            wp.materiais.forEach(material => {
              const materialId = Math.floor(Math.random() * 1000000);
              console.log(`Despachando material: ${material.nome}, ${material.preco}€ x ${material.quantidade}`);
              
              dispatch({
                type: "ADD_MATERIAL",
                workpackageId: wpId,
                material: {
                  id: materialId,
                  nome: material.nome,
                  preco: new Decimal(material.preco),
                  quantidade: material.quantidade,
                  ano_utilizacao: material.ano_utilizacao,
                  rubrica: material.rubrica,
                  workpackageId: wpId
                }
              });
            });
          }
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
