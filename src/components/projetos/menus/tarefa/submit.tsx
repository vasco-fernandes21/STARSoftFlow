import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, X, Upload, Calendar, AlertCircle, File, FileArchive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-5 w-5 text-azul" />;
    
    const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (["zip", "rar", "7z", "tar", "gz"].includes(fileType || "")) {
      return <FileArchive className="h-5 w-5 text-azul" />;
    } else if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(fileType || "")) {
      return <FileText className="h-5 w-5 text-azul" />;
    } else {
      return <File className="h-5 w-5 text-azul" />;
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Por favor, selecione um ficheiro");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simular progresso de upload
      const timer = setInterval(() => {
        setUploadProgress(prev => {
          const nextProgress = prev + Math.floor(Math.random() * 15);
          return nextProgress > 90 ? 90 : nextProgress;
        });
      }, 300);
      
      await onSubmit(entregavelId, selectedFile);
      
      // Finalizar o progresso
      clearInterval(timer);
      setUploadProgress(100);
      
      toast.success("Ficheiro submetido com sucesso");
    } catch (error) {
      toast.error("Erro ao submeter ficheiro");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  return (
    <Card className="overflow-hidden border border-azul/20 bg-azul/5 shadow-sm animate-in fade-in-50 slide-in-from-top-3 duration-300">
      <div className="border-b border-azul/10 bg-azul/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-azul/15">
              <FileText className="h-3.5 w-3.5 text-azul" />
            </div>
            <h4 className="text-sm font-medium text-azul-dark">Submeter Entregável</h4>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={uploading}
            className="h-7 w-7 rounded-full p-0 text-slate-500 hover:bg-azul/10 hover:text-azul-dark"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-4 rounded-md bg-white p-3 border border-slate-200 shadow-sm">
          <h5 className="mb-1 text-sm font-semibold text-slate-800">{nome}</h5>
          
          {descricao && (
            <p className="mb-2 text-xs text-slate-600">{descricao}</p>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            {data && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3 w-3 text-azul" />
                <span>Data limite: {format(new Date(data), "dd/MM/yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-xs font-medium text-slate-600">
              Selecionar ou arrastar ficheiro
            </Label>
            
            <div 
              className={cn(
                "relative rounded-md border-2 border-dashed transition-all",
                "py-6 px-3 flex flex-col items-center justify-center",
                dragActive ? "border-azul/40 bg-azul/5" : "border-slate-200 bg-white hover:bg-slate-50/80",
                selectedFile ? "border-azul/30 bg-azul/5" : ""
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <div className="text-center">
                  <div className="mb-3 flex justify-center">
                    <div className="rounded-full bg-azul/15 p-3">
                      {getFileIcon()}
                    </div>
                  </div>
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    {dragActive 
                      ? "Largar o ficheiro aqui" 
                      : "Arraste o ficheiro ou clique para selecionar"}
                  </p>
                  <p className="text-xs text-slate-500">
                    PDF, DOCX, XLSX, ZIP, JPG, PNG (máx. 20MB)
                  </p>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-azul/15 p-2">
                      {getFileIcon()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="h-7 w-7 rounded-full p-0 text-slate-500 hover:bg-slate-100"
                    disabled={uploading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              
              <Input
                id="file-upload"
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            
            {uploading && (
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-azul font-medium">A submeter ficheiro...</span>
                  <span className="text-slate-600">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" indicatorClassName="bg-azul" />
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 border border-amber-100">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Após a submissão, este entregável será automaticamente marcado como concluído. Certifique-se de que o ficheiro está correto antes de submeter.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={uploading}
              className="h-8 text-xs border-slate-200"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || uploading}
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-xs", 
                "bg-gradient-to-r from-azul to-azul-dark text-white",
                "hover:from-azul/90 hover:to-azul-dark/90 shadow-sm"
              )}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>A submeter...</span>
                </>
              ) : uploadProgress === 100 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Submetido</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Submeter Ficheiro</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
