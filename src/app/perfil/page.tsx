"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit,
  Check,
  Building,
  Clock,
  KeyRound,
  BarChart,
  Camera,
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Permissao, Regime, ProjetoEstado } from "@prisma/client";
import { AlocacoesDetalhadas } from "@/app/utilizadores/[param]/AlocacoesDetalhadas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';


// Define a type for user data that includes the optional informacoes field
interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  atividade: string | null;
  contratacao: Date | null;
  username: string | null;
  permissao: Permissao;
  regime: Regime | null;
  informacoes?: string | null;
  profilePhotoUrl?: string | null;
}

export default function PerfilPage() {
  // Move all hooks to the top and ensure they're called unconditionally
  const { data: session, status } = useSession();
  const router = useRouter();
  const utils = api.useUtils();
  const userId = session?.user?.id || "";  // Provide default value
  
  // State hooks
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cropper states
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImagePreview, setCroppedImagePreview] = useState<string | null>(null);

  // Query hooks - always call them regardless of userId
  const { data: userData, isLoading, refetch } = api.utilizador.findById.useQuery(
    userId, 
    { 
      enabled: Boolean(userId),
      refetchOnWindowFocus: false
    }
  );
  
  const { data: alocacoesData, isLoading: isLoadingAlocacoes } = api.utilizador.getAlocacoes.useQuery(
    { 
      userId, 
      ano: selectedYear 
    },
    { 
      enabled: Boolean(userId),
      refetchOnWindowFocus: false
    }
  );

  // Mutation hooks
  const updateUserMutation = api.utilizador.updateInformacoes.useMutation({
    onSuccess: (data) => {
      toast.success("Perfil atualizado com sucesso");
      if (data?.informacoes) {
        setBio(data.informacoes);
      }
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    }
  });
  
  const uploadPhotoMutation = api.utilizador.uploadProfilePhoto.useMutation({
    onSuccess: (data) => {
      utils.utilizador.findById.invalidate(userId);
      toast.success("Foto de perfil atualizada com sucesso");
      setPhotoPreview(null);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsUploading(false);
      setShowPhotoDialog(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });
  
  const deletePhotoMutation = api.utilizador.deleteAllUserPhotos.useMutation({
    onSuccess: () => {
      utils.utilizador.findById.invalidate(userId);
      toast.success("Foto de perfil removida com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Effect to set initial bio when userData changes
  useEffect(() => {
    if (userData?.informacoes) {
      setBio(userData.informacoes);
    }
  }, [userData?.informacoes]);
  
  // Transformar dados de alocações para o formato esperado pelo componente AlocacoesDetalhadas
  const transformAlocacoes = (alocacoes: any[]) => {
    if (!alocacoes || !Array.isArray(alocacoes)) return [];
    
    return alocacoes.map((alocacao: any) => ({
      ano: alocacao.ano,
      mes: alocacao.mes,
      ocupacao: alocacao.ocupacao,
      workpackage: {
        id: alocacao.workpackageId,
        nome: alocacao.workpackageNome
      },
      projeto: {
        id: alocacao.projetoId,
        nome: alocacao.projetoNome
      }
    }));
  };
  
  // Processar alocações
  const alocacoesReais = transformAlocacoes(alocacoesData?.real || []);
  const alocacoesPendentes = transformAlocacoes(alocacoesData?.pendente || []);
  
  // Obter anos disponíveis para seleção
  const anosDisponiveis = alocacoesData?.anos || [new Date().getFullYear()];
  
  // Handler para quando o crop é completado
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  // Formatar data de contratação
  const formatarDataContratacao = (data: Date | null | undefined) => {
    if (!data) return "Não definida";
    return format(data, "dd 'de' MMMM, yyyy", { locale: pt });
  };
  
  // Calcular tempo na empresa
  const calcularTempoEmpresa = (dataContratacao: Date | null | undefined) => {
    if (!dataContratacao) return "Não disponível";
    
    const hoje = new Date();
    const contratacao = new Date(dataContratacao);
    
    const anos = hoje.getFullYear() - contratacao.getFullYear();
    let meses = hoje.getMonth() - contratacao.getMonth();
    
    if (meses < 0) {
      return `${anos - 1} anos e ${meses + 12} meses`;
    }
    
    return `${anos} anos e ${meses} meses`;
  };
  
  // Obter texto para permissão
  const getPermissaoText = (permissao: string | undefined) => {
    const permissoes: Record<string, string> = {
      "ADMIN": "Administrador",
      "GESTOR": "Gestor",
      "COMUM": "Utilizador",
    };
    
    return permissoes[permissao || ""] || permissao;
  };
  
  // Obter texto para regime
  const getRegimeText = (regime: Regime | null | undefined) => {
    if (!regime) return "Não definido";
    
    const regimes: Record<string, string> = {
      "PARCIAL": "Tempo Parcial",
      "INTEGRAL": "Tempo Integral",
    };
    
    return regimes[regime] || regime;
  };
  
  // Handler para guardar perfil
  const handleSaveProfile = () => {
    if (!userData || !userId) return;
    
    updateUserMutation.mutate({
      userId: userId,
      informacoes: bio,
    });
  };

  // Handler para mudar o ano nas alocações
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };
  
  // Handle photo selection
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;
    
    const file = e.target.files[0];
    
    // Verificar tamanho do arquivo (limite de 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB em bytes
    if (file.size > maxSize) {
      toast.error("O arquivo é muito grande. O tamanho máximo é 5MB.");
      return;
    }
    
    // Verificar tipo de arquivo
    if (!file.type.match(/^image\/(jpeg|png|gif)$/)) {
      toast.error("Tipo de ficheiro inválido. Apenas imagens (JPEG, PNG, GIF) são permitidas.");
      return;
    }
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setPhotoPreview(e.target.result as string);
        setSelectedFile(file);
        setShowPhotoDialog(true);
        setIsCropping(true);
        // Reset crop settings
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Confirmar e processar upload da foto
  const confirmPhotoUpload = async () => {
    if (!selectedFile || !userId || !croppedImagePreview) {
      console.log("Missing required data:", { 
        selectedFile: !!selectedFile, 
        userId: !!userId, 
        croppedImagePreview: !!croppedImagePreview
      });
      setShowPhotoDialog(false);
      return;
    }
    
    try {
      console.log("Starting upload process...");
      setIsUploading(true);
      
      console.log("Calling mutation with:", {
        userId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        dataLength: croppedImagePreview.length
      });

      await uploadPhotoMutation.mutateAsync({
        userId,
        file: {
          name: selectedFile.name,
          type: selectedFile.type,
          data: croppedImagePreview,
        },
      });
    } catch (error) {
      console.error("Error in confirmPhotoUpload:", error);
      toast.error("Erro ao fazer upload da foto. Por favor, tente novamente.");
      setIsUploading(false);
    }
  };
  
  // Handler para apagar foto
  const handleDeletePhoto = async () => {
    if (!userId) return;
    deletePhotoMutation.mutate({ userId });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] py-8 px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-36" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
            <Skeleton className="h-[500px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-6">
              <Skeleton className="h-[240px] w-full rounded-2xl" />
              <Skeleton className="h-[320px] w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Função para criar a imagem cortada
  const createCroppedImage = async (imageSrc: string, pixelCrop: Area, rotation = 0): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    
    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No 2d context'));
          return;
        }
        
        // Definir as dimensões do canvas para o resultado do crop (quadrado)
        const size = Math.max(pixelCrop.width, pixelCrop.height);
        canvas.width = size;
        canvas.height = size;
        
        // guardar o estado atual do contexto
        ctx.save();
        
        // Limpar o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Mover a origem para o centro do canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Rotacionar o canvas
        if (rotation !== 0) {
          ctx.rotate((rotation * Math.PI) / 180);
        }
        
        // Desenhar a imagem com as transformações aplicadas
        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          -pixelCrop.width / 2,
          -pixelCrop.height / 2,
          pixelCrop.width,
          pixelCrop.height
        );
        
        // Restaurar o estado do contexto
        ctx.restore();
        
        // Converter o canvas para base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.95);
        resolve(base64Image);
      };
      
      image.onerror = (error) => reject(new Error('Image failed to load')); // Use a static error message
    });
  };
  
  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8 px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Título da Página */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">O Meu Perfil</h1>
          {isEditing ? (
            <Button 
              variant="default"
              size="sm"
              onClick={handleSaveProfile}
              className="rounded-full px-4 bg-azul hover:bg-azul/90 text-white shadow-md hover:shadow-lg transition-all duration-300"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                  A guardar...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Guardar Alterações
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="rounded-full px-4 border-azul text-azul hover:bg-azul/10 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Edit size={16} className="mr-2" />
              Editar Perfil
            </Button>
          )}
        </div>
        
        {/* Perfil Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* Coluna Lateral - Card do Perfil */}
          <div className="space-y-6">
            {/* Card do Perfil - Aumentado */}
            <Card className="border rounded-2xl shadow-lg overflow-hidden">
              <div className="h-36 bg-gradient-to-r from-azul/80 to-azul relative" />
              <CardContent className="pt-0 relative px-6 pb-6">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar com botões de ação mais acessíveis */}
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-xl absolute -top-16 left-1/2 transform -translate-x-1/2">
                      <AvatarImage 
                        id="profile-avatar"
                        src={userData?.profilePhotoUrl || `/images/default-avatar.png`}
                        alt={userData?.name || ""}
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/images/default-avatar.png";
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-azul to-blue-600 text-white text-2xl">
                        {userData?.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                      
                      {/* Loading overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/60 border-t-white"></div>
                        </div>
                      )}
                    </Avatar>

                    {/* Photo Action Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "absolute top-[-70px] right-[-60px] rounded-full p-2 shadow-md transition-all duration-200 border z-10",
                            isUploading 
                              ? "bg-gray-100 border-gray-200 cursor-not-allowed" 
                              : "bg-white hover:bg-gray-50 hover:shadow-lg border-gray-100"
                          )}
                          disabled={isUploading}
                          title="Opções de foto de perfil"
                        >
                          <Camera size={16} className="text-azul" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => fileInputRef.current?.click()}
                          className="cursor-pointer"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          <span>Carregar nova foto</span>
                        </DropdownMenuItem>
                        {userData?.profilePhotoUrl && (
                          <DropdownMenuItem
                            onClick={handleDeletePhoto}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Remover foto atual</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Hidden File Input */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden" 
                    />
                  </div>
                  
                  {/* Informações do Utilizador */}
                  <div className="mt-20">
                    <h2 className="text-2xl font-bold text-gray-900">{userData?.name}</h2>
                    <p className="text-gray-500 text-lg">{userData?.atividade || "Sem cargo definido"}</p>
                    
                    <Badge 
                      variant="outline" 
                      className="mt-2 bg-blue-50/80 text-azul border-blue-200/50 px-3 py-1 text-sm"
                    >
                      {getPermissaoText(userData?.permissao)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 w-full mt-8">
                    <div className="flex items-center text-base">
                      <Mail size={18} className="text-azul mr-3" />
                      <span className="text-gray-600">{userData?.email}</span>
                    </div>
                    <div className="flex items-center text-base">
                      <Building size={18} className="text-azul mr-3" />
                      <span className="text-gray-600">{getRegimeText(userData?.regime)}</span>
                    </div>
                    <div className="flex items-center text-base">
                      <Calendar size={18} className="text-azul mr-3" />
                      <span className="text-gray-600">Desde {formatarDataContratacao(userData?.contratacao)}</span>
                    </div>
                    <div className="flex items-center text-base">
                      <Clock size={18} className="text-azul mr-3" />
                      <span className="text-gray-600">{calcularTempoEmpresa(userData?.contratacao)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Links Rápidos */}
            <Card className="border rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="px-6 py-4 bg-gray-50 border-b">
                <CardTitle className="text-lg font-semibold text-gray-900">Links Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between rounded-none p-4 h-auto text-gray-700 font-normal hover:bg-gray-50"
                    disabled
                  >
                    <div className="flex items-center">
                      <Shield size={16} className="mr-3 text-azul" />
                      <span>Privacidade e Segurança</span>
                    </div>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between rounded-none p-4 h-auto text-gray-700 font-normal hover:bg-gray-50"
                    disabled
                  >
                    <div className="flex items-center">
                      <KeyRound size={16} className="mr-3 text-azul" />
                      <span>Alterar Password</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Conteúdo Principal - Informações e Alocações lado a lado */}
          <div className="space-y-6">
            {/* Informações Profissionais */}
            <Card className="border rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="px-6 py-4 bg-gray-50 border-b">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  <User className="inline mr-2 h-4 w-4" />
                  Informações Profissionais
                </CardTitle>
                <CardDescription>Informações sobre a sua atividade na empresa</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="md:col-span-2">
                  <Label htmlFor="bio">Short CV</Label>
                  <Textarea 
                    id="bio" 
                    rows={6}
                    disabled={!isEditing}
                    className={cn(
                      "flex w-full rounded-md border bg-white px-3 py-2 text-sm resize-none",
                      "mt-1 focus-visible:outline-none",
                      isEditing ? "focus:ring-2 focus:ring-azul/30" : "opacity-90"
                    )}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={isEditing ? "Descreva suas qualificações, experiência e competências aqui..." : "Sem informações adicionais."}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Alocações */}
            <Card className="border rounded-2xl shadow-lg overflow-hidden">
              <CardHeader className="px-6 py-4 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    <BarChart className="inline mr-2 h-4 w-4" />
                    Alocações
                  </CardTitle>
                  <CardDescription>Gestão de tempo em projetos</CardDescription>
                </div>
                
                {/* Seletor de ano - alinhado com o header */}
                {anosDisponiveis.length > 0 && (
                  <div className="mt-3 sm:mt-0">
                    <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-sm">
                      {anosDisponiveis.length <= 3 ? (
                        anosDisponiveis.map((ano) => (
                          <button
                            key={ano}
                            onClick={() => handleYearChange(ano)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              selectedYear === ano
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            } `}
                          >
                            {ano}
                          </button>
                        ))
                      ) : (
                        <>
                          {anosDisponiveis.slice(0, 2).map((ano) => (
                            <button
                              key={ano}
                              onClick={() => handleYearChange(ano)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                selectedYear === ano
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-gray-500 hover:text-gray-700"
                              } `}
                            >
                              {ano}
                            </button>
                          ))}
                          <button 
                            className="rounded-full px-2 py-1 text-xs font-medium text-gray-500"
                            disabled
                          >
                            ...
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingAlocacoes ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <AlocacoesDetalhadas 
                    alocacoesReais={alocacoesReais} 
                    alocacoesPendentes={alocacoesPendentes} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Photo Confirmation Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={(open) => {
        if (!open) {
          setPhotoPreview(null);
          setSelectedFile(null);
          setIsCropping(false);
          setCroppedImagePreview(null);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setRotation(0);
        }
        setShowPhotoDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isCropping ? "Ajustar foto de perfil" : "Confirmar nova foto"}</DialogTitle>
            <DialogDescription>
              {isCropping 
                ? "Arraste, faça zoom e gire a imagem para ajustar como deseja que ela apareça"
                : "Tem certeza que deseja usar esta imagem como a sua nova foto de perfil?"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4">
            {photoPreview && isCropping && (
              <>
                {/* Container do Cropper */}
                <div className="relative w-full h-[300px] overflow-hidden rounded-lg border">
                  <Cropper
                    image={photoPreview}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>
                
                {/* Controles de Zoom */}
                <div className="flex w-full items-center gap-2 py-2">
                  <ZoomOut className="h-4 w-4 text-gray-500" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </div>
                
                {/* Controle de Rotação */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((r) => r + 90)}
                    className="flex items-center gap-1"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span>Rodar</span>
                  </Button>
                </div>
              </>
            )}
            
            {!isCropping && croppedImagePreview && (
              <div className="relative w-40 h-40 overflow-hidden rounded-full border-4 border-white shadow-lg">
                <img 
                  src={croppedImagePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            {isCropping ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPhotoDialog(false);
                    setPhotoPreview(null);
                    setSelectedFile(null);
                  }}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (photoPreview && croppedAreaPixels) {
                      try {
                        const croppedImage = await createCroppedImage(photoPreview, croppedAreaPixels, rotation);
                        setCroppedImagePreview(croppedImage);
                        setIsCropping(false);
                      } catch (error) {
                        console.error('Erro ao processar imagem:', error);
                        toast.error('Erro ao processar imagem. Tente novamente.');
                      }
                    }
                  }}
                  className="bg-azul hover:bg-azul/90 text-white"
                  disabled={isUploading || !croppedAreaPixels}
                >
                  Confirmar Corte
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCropping(true);
                    setCroppedImagePreview(null);
                  }}
                  disabled={isUploading}
                >
                  Voltar
                </Button>
                <Button
                  onClick={confirmPhotoUpload}
                  className="bg-azul hover:bg-azul/90 text-white"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                      A carregar...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
