"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjetoForm, ProjetoFormProvider } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Alocacao {
  mes: number;
  ano: number;
  percentagem: number;
}

interface Recurso {
  nome: string;
  alocacoes: Alocacao[];
}

interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
}

function ImportarExcelContent() {
  const { dispatch } = useProjetoForm();
  const [sheets, setSheets] = useState<{[key: string]: any[][]}>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [workpackages, setWorkpackages] = useState<WorkpackageSimples[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const extrairDadosRH = (data: any[][]) => {
    const wps: WorkpackageSimples[] = [];
    let wpAtual: WorkpackageSimples | null = null;

    // Extrair anos e meses do cabeçalho
    const anos = data[3]?.slice(6) || []; // Linha dos anos
    const meses = data[4]?.slice(6) || []; // Linha dos códigos de data Excel

    // Função para converter código Excel para data
    const excelDateToJS = (excelDate: number) => {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return {
        mes: date.getMonth() + 1,
        ano: date.getFullYear()
      };
    };

    // Começar da linha 8 (índice 7) que é onde começam os dados reais
    for (let i = 7; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Se é uma linha de workpackage (A1, A2, etc.)
      if (row[1]?.match(/^A\d+$/)) {
        console.log("Encontrado workpackage:", row[1], row[2]);
        wpAtual = {
          codigo: row[1],
          nome: row[2] || '',
          recursos: []
        };
        wps.push(wpAtual);
      }
      // Se é uma linha de recurso
      else if (wpAtual && row[3]) {
        console.log("Processando recurso:", row[3]);
        const recurso: Recurso = {
          nome: row[3],
          alocacoes: []
        };

        // Processar alocações (começam no índice 6)
        for (let j = 6; j < 42; j++) { // Limitamos a 36 meses (3 anos)
          const valor = row[j];
          if (valor && typeof valor === 'number' && !isNaN(valor) && valor > 0 && valor < 2) { // Limitamos a valores entre 0 e 1 (percentagens)
            const dataExcel = meses[j - 6];
            const { mes, ano } = excelDateToJS(dataExcel);
            
            console.log(`Alocação encontrada: mês ${mes}, ano ${ano}, valor ${valor}`);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Iniciando upload do ficheiro");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("Nenhum ficheiro selecionado");
      return;
    }

    console.log("Ficheiro selecionado:", file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log("Ficheiro carregado, iniciando processamento");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log("Sheets encontradas:", workbook.SheetNames);
        
        // Extrair todas as sheets
        const sheetsData: {[key: string]: any[][]} = {};
        const names = workbook.SheetNames;
        
        names.forEach(name => {
          console.log(`Processando sheet: ${name}`);
          const sheet = workbook.Sheets[name];
          sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          // Se for a sheet RH_Budget_SUBM, processar os workpackages
          if (name === 'RH_Budget_SUBM') {
            console.log("Encontrada sheet RH_Budget_SUBM");
            const wps = extrairDadosRH(sheetsData[name]);
            console.log("Workpackages extraídos:", wps);
            setWorkpackages(wps);
          }
        });
        
        console.log("Todas as sheets processadas");
        setSheets(sheetsData);
        setSheetNames(names);
      } catch (error) {
        console.error("Erro detalhado ao processar o ficheiro Excel:", error);
        alert("Ocorreu um erro ao processar o ficheiro Excel. Verifique o formato do ficheiro.");
      }
    };

    reader.onerror = (error) => {
      console.error("Erro ao ler o ficheiro:", error);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Importar Dados do Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-azul/30 rounded-lg">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button 
                className="bg-azul hover:bg-azul/90"
                onClick={handleButtonClick}
              >
                Selecionar Ficheiro Excel
              </Button>
              <p className="mt-2 text-sm text-azul/60">
                Selecione um ficheiro Excel com o formato correto
              </p>
            </div>

            {workpackages.length > 0 && (
              <div className="space-y-6">
                {workpackages.map((wp) => (
                  <Card key={wp.codigo} className="p-4">
                    <h3 className="text-lg font-medium mb-4">
                      {wp.codigo} - {wp.nome}
                    </h3>
                    <div className="space-y-6">
                      {wp.recursos.map((recurso, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-3 text-azul">
                            {recurso.nome}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {recurso.alocacoes
                              .filter(aloc => aloc && aloc.percentagem != null)
                              .map((aloc, i) => (
                                <div 
                                  key={i} 
                                  className="bg-white p-2 rounded shadow-sm text-sm"
                                >
                                  {aloc.mes}/{aloc.ano}: {aloc.percentagem?.toFixed(0)}%
                                </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {sheetNames.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Conteúdo das Sheets</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={sheetNames[0]}>
                    <TabsList>
                      {sheetNames.map(name => (
                        <TabsTrigger key={name} value={name}>
                          {name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {sheetNames.map(name => (
                      <TabsContent key={name} value={name}>
                        <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[500px]">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(sheets[name], null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ImportarExcelPage() {
  return (
    <ProjetoFormProvider>
      <ImportarExcelContent />
    </ProjetoFormProvider>
  );
}
