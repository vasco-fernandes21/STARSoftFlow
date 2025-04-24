"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

function ImportarExcelContent() {
  const [sheets, setSheets] = useState<{ [key: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
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
        const workbook = XLSX.read(data, { type: "array" });

        console.log("Sheets encontradas:", workbook.SheetNames);

        const sheetsData: { [key: string]: any[][] } = {};
        const names = workbook.SheetNames;

        names.forEach((name) => {
          console.log(`Processando sheet: ${name}`);
          const sheet = workbook.Sheets[name];
          if (sheet) {
            sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          }
        });

        setSheets(sheetsData);
        setSheetNames(names);
        toast.success("Excel convertido com sucesso!");

      } catch (error) {
        console.error("Erro ao processar o ficheiro Excel:", error);
        toast.error("Ocorreu um erro ao processar o ficheiro Excel.");
      }
    };

    reader.onerror = (error) => {
      console.error("Erro ao ler o ficheiro:", error);
      toast.error("Erro ao ler o ficheiro.");
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Conversor Excel para JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-azul/30 p-6">
              <FileSpreadsheet className="mb-3 h-12 w-12 text-azul/70" />
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button className="bg-azul hover:bg-azul/90" onClick={handleButtonClick}>
                Selecionar Ficheiro Excel
              </Button>
              <p className="mt-2 text-sm text-azul/60">
                Selecione um ficheiro Excel para converter para JSON
              </p>
            </div>

            {sheetNames.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Conteúdo das Sheets</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={sheetNames[0]}>
                    <TabsList>
                      {sheetNames.map((name) => (
                        <TabsTrigger key={name} value={name}>
                          {name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {sheetNames.map((name) => (
                      <TabsContent key={name} value={name}>
                        <div className="max-h-[500px] overflow-auto rounded-md bg-gray-50 p-4">
                          <pre className="whitespace-pre-wrap text-xs">
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
  return <ImportarExcelContent />;
}
