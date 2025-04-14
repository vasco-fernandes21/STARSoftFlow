"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { RelatorioTemplate } from "../templates/relatorio-template";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";


// Definir o tipo do retorno da mutation
type PDFResponse = RouterOutputs["utilizador"]["gerarRelatorioPDF"];

export default function PreviewPage() {
  const params = useParams();
  const username = params?.username as string;
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  
  // Usar a query para obter os dados do relatório
  const { data, isLoading, error } = api.utilizador.getRelatorioMensal.useQuery({
    username,
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

  // Gerar o HTML do template quando os dados mudarem
  useEffect(() => {
    async function generateTemplate() {
      if (data) {
        const html = await RelatorioTemplate({
          data,
          periodo: { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() },
        });
        setTemplateHtml(html);
      }
    }
    generateTemplate();
  }, [data]);

  // Mutation para gerar o PDF
  const { mutate: gerarPDF } = api.utilizador.gerarRelatorioPDF.useMutation({
    onSuccess: (data: PDFResponse) => {
      // Converter o Base64 para Blob
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      // Criar URL e fazer download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsGenerating(false);
    },
    onError: (error: unknown) => {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
      setIsGenerating(false);
    }
  });
   
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      setIsGenerating(true);
      gerarPDF({
        username,
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear()
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
      setIsGenerating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p>Carregando dados do relatório...</p>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-red-500">Erro ao carregar dados: {error?.message || 'Dados não disponíveis'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <div className="absolute top-4 right-4 z-50">
        <Button 
          onClick={handleDownloadPDF}
          className="bg-azul hover:bg-azul/90 text-white"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A gerar PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Descarregar PDF
            </>
          )}
        </Button>
      </div>
      <div 
        ref={reportRef}
        className="min-h-screen bg-white"
        dangerouslySetInnerHTML={{ __html: templateHtml }}
      />
    </div>
  );
} 