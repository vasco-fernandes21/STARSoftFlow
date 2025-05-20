import { api } from '@/trpc/react';

export function usePDFExport() {
  return api.utilizador.gerarRelatorioPDF.useMutation({
    onSuccess: (data: { pdfBase64: string; fileName: string }) => {
      console.log('PDF export response:', data);
      // Check for valid base64 string (simple regex, not exhaustive)
      const isBase64 = typeof data.pdfBase64 === 'string' && data.pdfBase64.length > 0 && /^[A-Za-z0-9+/=\r\n]+$/.test(data.pdfBase64);
      if (!isBase64) {
        console.error('pdfBase64 não é uma string base64 válida:', data.pdfBase64);
        return;
      }
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      // Adicionar um toast de erro seria uma boa prática aqui
      console.error("Erro ao gerar PDF:", error);
    
      // Exemplo com react-hot-toast ou sonner:
      // toast.error(`Erro ao gerar PDF: ${error.message}`);
    }
  });
}
