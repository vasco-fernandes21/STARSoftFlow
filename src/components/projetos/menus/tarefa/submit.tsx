import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface EntregavelSubmitProps {
  entregavelId: string;
  nome: string;
  descricao?: string | null;
  data?: Date | null;
  onCancel: () => void;
  onSubmit: (entregavelId: string, file: File) => Promise<void>;
}

export function EntregavelSubmit({ 
  entregavelId, 
  nome, 
  descricao, 
  data,
  onCancel,
  onSubmit
}: EntregavelSubmitProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Por favor, selecione um ficheiro");
      return;
    }

    setUploading(true);
    try {
      await onSubmit(entregavelId, selectedFile);
      toast.success("Ficheiro submetido com sucesso");
    } catch (error) {
      toast.error("Erro ao submeter ficheiro");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">
          Submeter Entregável
        </h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label className="text-azul/80 text-sm">Nome do Entregável</Label>
          <p className="text-gray-700 font-medium mt-1">{nome}</p>
        </div>
        
        {descricao && (
          <div>
            <Label className="text-azul/80 text-sm">Descrição</Label>
            <p className="text-gray-600 text-sm mt-1">{descricao}</p>
          </div>
        )}
        
        {data && (
          <div>
            <Label className="text-azul/80 text-sm">Data de Entrega</Label>
            <p className="text-gray-700 text-sm mt-1">{new Date(data).toLocaleDateString()}</p>
          </div>
        )}

        <div className="mt-2">
          <Label htmlFor="file-upload" className="text-azul/80 text-sm">Ficheiro</Label>
          <div className="mt-1 relative">
            <Input
              id="file-upload"
              type="file"
              className="text-sm file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-azul/10 file:text-azul file:font-medium hover:file:bg-azul/20"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-md">
                <div className="h-5 w-5 border-2 border-azul/30 border-t-azul rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-500 mt-1">
              Ficheiro selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={uploading}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Submeter
          </Button>
        </div>
      </div>
    </Card>
  );
}