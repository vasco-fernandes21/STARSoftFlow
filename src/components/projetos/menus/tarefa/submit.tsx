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
  onSubmit,
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
    <Card className="border border-azul/10 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-azul/10">
          <FileText className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">Submeter Entregável</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label className="text-sm text-azul/80">Nome do Entregável</Label>
          <p className="mt-1 font-medium text-gray-700">{nome}</p>
        </div>

        {descricao && (
          <div>
            <Label className="text-sm text-azul/80">Descrição</Label>
            <p className="mt-1 text-sm text-gray-600">{descricao}</p>
          </div>
        )}

        {data && (
          <div>
            <Label className="text-sm text-azul/80">Data de Entrega</Label>
            <p className="mt-1 text-sm text-gray-700">{new Date(data).toLocaleDateString()}</p>
          </div>
        )}

        <div className="mt-2">
          <Label htmlFor="file-upload" className="text-sm text-azul/80">
            Ficheiro
          </Label>
          <div className="relative mt-1">
            <Input
              id="file-upload"
              type="file"
              className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-azul/10 file:px-3 file:py-1.5 file:font-medium file:text-azul hover:file:bg-azul/20"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70 backdrop-blur-sm">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-azul/30 border-t-azul"></div>
              </div>
            )}
          </div>
          {selectedFile && (
            <p className="mt-1 text-xs text-gray-500">
              Ficheiro selecionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={uploading}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="bg-azul text-white hover:bg-azul/90"
          >
            <Upload className="mr-2 h-4 w-4" />
            Submeter
          </Button>
        </div>
      </div>
    </Card>
  );
}
