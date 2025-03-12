import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabTitle } from "../../components/TabTitle";
import { TabNavigation } from "../../components/TabNavigation";
import { CheckCircle, FileText, Calendar, Euro, Briefcase, Users, AlertCircle, ClipboardCheck, Code, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ResumoTabProps {
  onNavigateBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ResumoTab({ onNavigateBack, onSubmit, isSubmitting }: ResumoTabProps) {
  const { state } = useProjetoForm();
  const [showDevTools, setShowDevTools] = useState(false);
  const [copied, setCopied] = useState(false);

  // Verificar se o projeto está completo
  const isProjetoValido = Boolean(
    state.nome?.trim() &&
    state.inicio &&
    state.fim &&
    state.overhead !== undefined &&
    state.taxa_financiamento !== undefined &&
    state.valor_eti !== undefined &&
    state.workpackages?.length > 0
  );

  // Formatar data
  const formatarData = (data: Date | string | null | undefined) => {
    if (!data) return "Não definida";
    return data instanceof Date
      ? data.toLocaleDateString('pt-PT')
      : new Date(data).toLocaleDateString('pt-PT');
  };

  // Formatar valor numérico
  const formatarNumero = (valor: any, sufixo = "") => {
    if (valor === undefined || valor === null) return "Não definido";
    return `${Number(valor)}${sufixo}`;
  };

  // Copiar JSON para o clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setCopied(true);
    toast.success("JSON copiado para o clipboard");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-[70vh]">
      <TabTitle
        title="Resumo do Projeto"
        subtitle="Revise as informações antes de finalizar"
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <div className="p-6 flex-1">
        {!isProjetoValido && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <h4 className="font-medium">Informações Incompletas</h4>
            </div>
            <p className="ml-6 mt-1 text-sm">
              Algumas informações obrigatórias estão em falta. Por favor, revise as secções anteriores.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Secção de Ferramentas de Developer */}
          <Card className="border-blue-300 border-2 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => setShowDevTools(!showDevTools)}
              >
                <div className="flex items-center">
                  <Code className="h-4 w-4 text-blue-600 mr-2" />
                  <CardTitle className="text-base text-blue-700">Ferramentas de Desenvolvimento</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                >
                  {showDevTools ? (
                    <ChevronUp className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-blue-600" />
                  )}
                </Button>
              </div>
              <CardDescription className="text-blue-600/80">
                Visualização do estado completo do projeto em formato JSON para fins de desenvolvimento
              </CardDescription>
            </CardHeader>
            
            {showDevTools && (
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyToClipboard}
                    className="text-xs h-8 rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar JSON
                      </>
                    )}
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px] rounded-md border border-blue-200 bg-blue-50/50">
                  <pre className="p-4 text-xs text-blue-900 font-mono">
                    {JSON.stringify(state, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            )}
          </Card>

          {/* Informações Básicas */}
          <Card className="border-azul/10">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-azul/60 mr-2" />
                <CardTitle className="text-base">Informações Básicas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-azul/60">Nome</dt>
                  <dd className="text-sm font-medium">{state.nome || "Não definido"}</dd>
                </div>
                {state.descricao && (
                  <div>
                    <dt className="text-sm text-azul/60 mb-1">Descrição</dt>
                    <dd className="text-sm bg-azul/5 p-3 rounded-md">
                      {state.descricao}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card className="border-azul/10">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-azul/60 mr-2" />
                <CardTitle className="text-base">Datas do Projeto</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-azul/60">Data de Início</dt>
                  <dd className="text-sm font-medium">{formatarData(state.inicio)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-azul/60">Data de Conclusão</dt>
                  <dd className="text-sm font-medium">{formatarData(state.fim)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Finanças */}
          <Card className="border-azul/10">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Euro className="h-4 w-4 text-azul/60 mr-2" />
                <CardTitle className="text-base">Informações Financeiras</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-azul/60">Overhead</dt>
                  <dd className="text-sm font-medium">{formatarNumero(state.overhead, "%")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-azul/60">Taxa de Financiamento</dt>
                  <dd className="text-sm font-medium">{formatarNumero(state.taxa_financiamento, "%")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-azul/60">Valor ETI</dt>
                  <dd className="text-sm font-medium">{formatarNumero(state.valor_eti, "€")}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Workpackages */}
          <Card className="border-azul/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 text-azul/60 mr-2" />
                  <CardTitle className="text-base">Workpackages</CardTitle>
                </div>
                <Badge variant="outline" className="bg-azul/5">
                  {state.workpackages?.length || 0} workpackage(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {state.workpackages && state.workpackages.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {state.workpackages.map((wp, index) => (
                      <div key={wp.id} className="border border-azul/10 rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">{wp.nome}</h4>
                          <Badge variant="outline" className="text-xs">
                            {formatarData(wp.inicio)} - {formatarData(wp.fim)}
                          </Badge>
                        </div>
                        
                        {wp.descricao && (
                          <p className="text-xs text-azul/70 mb-2">{wp.descricao.toString()}</p>
                        )}
                        
                        <div className="flex gap-2 text-xs">
                          {wp.tarefas?.length ? (
                            <Badge variant="secondary" className="bg-azul/5 text-xs">
                              {wp.tarefas.length} tarefa(s)
                            </Badge>
                          ) : null}
                          
                          {wp.recursos?.length ? (
                            <Badge variant="secondary" className="bg-azul/5 text-xs">
                              {wp.recursos.length} alocação(ões)
                            </Badge>
                          ) : null}

                          {wp.alocacaoRecursos?.length ? (
                            <Badge variant="secondary" className="bg-azul/5 text-xs">
                              {wp.alocacaoRecursos.length} alocação(ões)
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-azul/60 text-center py-4">
                  Nenhum workpackage definido
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recursos */}
          <Card className="border-azul/10">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-azul/60 mr-2" />
                <CardTitle className="text-base">Recursos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {state.workpackages?.some(wp => (wp.alocacaoRecursos?.length || wp.recursos?.length)) ? (
                <p className="text-sm">
                  O projeto tem recursos alocados em {
                    state.workpackages.filter(wp => (wp.alocacaoRecursos?.length || wp.recursos?.length)).length
                  } workpackage(s).
                </p>
              ) : (
                <p className="text-sm text-azul/60 text-center py-2">
                  Nenhum recurso alocado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TabNavigation
        onBack={onNavigateBack}
        onSubmit={onSubmit}
        backLabel="Anterior: Recursos"
        submitLabel="Finalizar Projeto"
        isLastStep={true}
        isSubmitting={isSubmitting}
        isSubmitDisabled={!isProjetoValido}
      />
    </div>
  );
} 