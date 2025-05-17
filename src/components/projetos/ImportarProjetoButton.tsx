"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, FileSpreadsheet, Upload } from "lucide-react";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from "xlsx";
import { Decimal } from "decimal.js";
import { generateUUID } from "@/server/api/utils/token";
import { api } from "@/trpc/react";
import { GerirFinanciamentosModal } from "@/components/projetos/criar/novo/financas/GerirFinanciamentosModal";
import { FormContratado } from "@/components/projetos/criar/novo/recursos/form-contratado";
import { toast } from "sonner";
import {
  type EstadoImportacao,
  type MaterialImportacao,
  type WorkpackageSimples,
  type FinanciamentoAPI,
  converterExcelParaJson,
  extrairDadosProjeto,
  extrairDadosFinanciamento,
  extrairValorEti,
  extrairMateriais,
  extrairUtilizadores,
  extrairDadosRH,
  atribuirMateriaisAosWorkpackages,
} from "@/lib/importar_excel";

// Componente Principal
export default function ImportarProjetoButton() {
  const { dispatch } = useProjetoForm();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalFinanciamentosAberto, setModalFinanciamentosAberto] = useState(false);
  const [showContratadoForm, setShowContratadoForm] = useState(false);
  const [shouldRenderContratadoForm, setShouldRenderContratadoForm] = useState(false);
  const [novoContratadoData, setNovoContratadoData] = useState<{
    nome: string;
    salario: number | undefined;
  } | null>(null);
  const [recursosNaoAssociados, setRecursosNaoAssociados] = useState<Array<{
    nome: string;
    salario: number | undefined;
  }>>([]);
  const [dadosFinanciamento, setDadosFinanciamento] = useState<{
    nome: string;
    overhead: number | null;
    taxa_financiamento: number | null;
    valor_eti: number | null;
  } | null>(null);
  
  const [estadoImportacao, setEstadoImportacao] = useState<EstadoImportacao | null>(null);
  const [processamentoPendente, setProcessamentoPendente] = useState(false);
  const [mapaContratadosCriados, setMapaContratadosCriados] = useState<Map<string, string>>(new Map());

  const { data: financiamentosData } = api.financiamento.findAll.useQuery({ limit: 100 });
  const utils = api.useUtils();

  // Função para processar a importação final
  const processarImportacaoFinal = useCallback(() => {
    if (!estadoImportacao) {
      toast.error("Erro interno ao processar importação.");
      setIsLoading(false);
      return;
    }

    const {
      nomeProjeto,
      tipoFinanciamento,
      taxaFinanciamento,
      overhead,
      valorEti,
      workpackages,
      materiais,
      dataInicioProjeto,
      dataFimProjeto
    } = estadoImportacao;

    dispatch({ type: "RESET" });

    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        nome: nomeProjeto,
        inicio: dataInicioProjeto,
        fim: dataFimProjeto,
        overhead: overhead ? new Decimal(Number((overhead / 100).toFixed(2))) : new Decimal(0),
        taxa_financiamento: taxaFinanciamento ? new Decimal(Number((taxaFinanciamento / 100).toFixed(2))) : new Decimal(0),
        valor_eti: valorEti ? new Decimal(Number(valorEti).toFixed(2)) : new Decimal(0),
      },
    });

    // Processar workpackages com as alocações atualizadas
    workpackages.forEach((wp) => {
      const wpId = generateUUID();

      dispatch({
        type: "ADD_WORKPACKAGE",
        workpackage: {
          id: wpId,
          nome: wp.nome,
          descricao: null,
          inicio: wp.dataInicio,
          fim: wp.dataFim,
          estado: false,
          tarefas: [],
          materiais: [],
          recursos: [],
        },
      });

      wp.recursos.forEach((recurso) => {
        if (!recurso.userId) {
          return;
        }

        recurso.alocacoes.forEach((alocacao) => {
          dispatch({
            type: "ADD_ALOCACAO",
            workpackageId: wpId,
            alocacao: {
              userId: recurso.userId!,
              mes: alocacao.mes,
              ano: alocacao.ano,
              ocupacao: new Decimal(alocacao.percentagem / 100),
            },
          });
        });
      });

      wp.materiais.forEach((material) => {
        dispatch({
          type: "ADD_MATERIAL",
          workpackageId: wpId,
          material: {
            id: Math.floor(Math.random() * 1000000),
            nome: material.nome,
            preco: new Decimal(material.preco),
            quantidade: material.quantidade,
            mes: wp.dataInicio ? wp.dataInicio.getMonth() + 1 : new Date().getMonth() + 1,
            ano_utilizacao: material.ano_utilizacao,
            rubrica: material.rubrica,
            descricao: null,
            estado: false,
          },
        });
      });
    });

    // Processar financiamento
    if (tipoFinanciamento) {
      try {
        const rawFinanciamentos = (financiamentosData?.items || []) as unknown as Array<{
          id: number;
          nome: string;
          overhead: Decimal | string;
          taxa_financiamento: Decimal | string;
          valor_eti: Decimal | string;
        }>;

        const financiamentos: FinanciamentoAPI[] = rawFinanciamentos.map((f) => ({
          id: f.id,
          nome: f.nome,
          overhead: String(f.overhead),
          taxa_financiamento: String(f.taxa_financiamento),
          valor_eti: String(f.valor_eti),
        }));

        const tipoNormalizado = tipoFinanciamento.trim().toLowerCase();
        const financiamentoExistente = financiamentos.find(
          (f) => f.nome.trim().toLowerCase() === tipoNormalizado
        );

        if (financiamentoExistente) {
          dispatch({
            type: "UPDATE_PROJETO",
            data: {
              financiamentoId: financiamentoExistente.id,
            },
          });
        } else if (tipoFinanciamento) {
          setDadosFinanciamento({
            nome: tipoFinanciamento,
            overhead,
            taxa_financiamento: taxaFinanciamento,
            valor_eti: valorEti,
          });
          setModalFinanciamentosAberto(true);
        }
      } catch (error) {
        toast.error("Erro ao verificar financiamentos existentes.");
      }
    }

    setEstadoImportacao(null); 
    setOpen(false);
    setIsLoading(false);
    toast.success("Projeto importado com sucesso!");

  }, [dispatch, estadoImportacao, financiamentosData]);

  useEffect(() => {
    if (processamentoPendente && estadoImportacao) {
      console.log("[Importação useEffect] Trigger: Processando importação final");
      processarImportacaoFinal(); 
      setProcessamentoPendente(false);
    }
  }, [processamentoPendente, estadoImportacao, processarImportacaoFinal]);

  const handleFileUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setRecursosNaoAssociados([]);
    setEstadoImportacao(null);
    setProcessamentoPendente(false);
    setMapaContratadosCriados(new Map());

    try {
      const dadosUtilizadores = await utils.utilizador.findAll.fetch();
      const utilizadores = extrairUtilizadores(dadosUtilizadores);

      if (!utilizadores) {
        toast.error("Não foi possível obter a lista de utilizadores inicial.");
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();

      reader.onload = async (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetsData = converterExcelParaJson(workbook);

          let wps: WorkpackageSimples[] = [];
          let materiais: MaterialImportacao[] = [];
          let dataInicioProjeto: Date | null = null;
          let dataFimProjeto: Date | null = null;
          let nomeProjeto = "";
          let tipoFinanciamento = "";
          let taxaFinanciamento: number | null = null;
          let overhead: number | null = null;
          let valorEti: number | null = null;

          if (sheetsData["HOME"]) {
            const dadosProjeto = extrairDadosProjeto(sheetsData["HOME"]);
            nomeProjeto = dadosProjeto.nomeProjeto;
          }

          if (sheetsData["BUDGET"]) {
            const dadosFinanciamentoExt = extrairDadosFinanciamento(sheetsData["BUDGET"]);
            tipoFinanciamento = dadosFinanciamentoExt.tipoFinanciamento;
            taxaFinanciamento = dadosFinanciamentoExt.taxaFinanciamento;
            overhead = dadosFinanciamentoExt.overhead;
            valorEti = dadosFinanciamentoExt.valorEti;
          }

          if (sheetsData["RH_Budget_SUBM"]) {
            const valorEtiRH = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
            if (valorEtiRH !== null) {
              valorEti = valorEtiRH;
            }
            const resultado = extrairDadosRH(sheetsData["RH_Budget_SUBM"], utilizadores);
            wps = resultado.workpackages;
            dataInicioProjeto = resultado.dataInicioProjeto;
            dataFimProjeto = resultado.dataFimProjeto;

            const recursosNaoMatchados = wps.flatMap(wp => 
              wp.recursos.filter(r => !r.userId).map(r => ({
                nome: r.nome,
                salario: r.salario ? Math.round(r.salario) : undefined
              }))
            );

            const recursosUnicos = Array.from(new Map(
              recursosNaoMatchados.map(item => [item.nome, item])
            ).values());

            const estadoAtual : EstadoImportacao = {
              sheetsData,
              nomeProjeto,
              tipoFinanciamento,
              taxaFinanciamento,
              overhead,
              valorEti,
              workpackages: wps,
              materiais: [],
              dataInicioProjeto,
              dataFimProjeto
            };

            if (sheetsData["Outros_Budget"]) {
              materiais = extrairMateriais(sheetsData["Outros_Budget"]);
              estadoAtual.materiais = materiais;
            }

            if (wps.length > 0 && materiais.length > 0) {
               estadoAtual.workpackages = atribuirMateriaisAosWorkpackages(estadoAtual.workpackages, estadoAtual.materiais);
            }
            
            setEstadoImportacao(estadoAtual);

            if (recursosUnicos.length > 0) {
              setRecursosNaoAssociados(recursosUnicos);
              setOpen(false);
              
              setTimeout(() => {
                if (recursosUnicos[0]) {
                  setNovoContratadoData(recursosUnicos[0]);
                  setShouldRenderContratadoForm(true);
                  setShowContratadoForm(true);
                }
              }, 500);
              
              setIsLoading(false);
              return;
            } else {
               setProcessamentoPendente(true);
            }
          } else {
             if (sheetsData["Outros_Budget"]) {
                materiais = extrairMateriais(sheetsData["Outros_Budget"]);
             }
             
             setEstadoImportacao({
                sheetsData,
                nomeProjeto,
                tipoFinanciamento,
                taxaFinanciamento,
                overhead,
                valorEti,
                workpackages: [],
                materiais,
                dataInicioProjeto: null,
                dataFimProjeto: null,
             });
             setProcessamentoPendente(true);
          }

        } catch (error) {
          toast.error("Ocorreu um erro durante a leitura dos dados do ficheiro");
          setIsLoading(false);
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          if (!processamentoPendente && recursosNaoAssociados.length === 0) {
             //setIsLoading(false);
          }
        }
      };

      reader.onerror = () => {
        toast.error("Erro ao ler o ficheiro");
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error("Ocorreu um erro durante a importação");
      setIsLoading(false);
    }
  }, [dispatch, utils]);

  const handleContratadoCriado = useCallback(async (novoUserId: string) => {
    if (!novoContratadoData) {
      toast.error("Erro interno ao associar contratado.");
      setShowContratadoForm(false);
      setIsLoading(false);
      return;
    }
    
    const nomeOriginal = novoContratadoData.nome;
    setMapaContratadosCriados(prevMap => new Map(prevMap).set(nomeOriginal, novoUserId));
    
    const recursosRestantes = recursosNaoAssociados.slice(1);
    setRecursosNaoAssociados(recursosRestantes);

    if (recursosRestantes.length > 0 && recursosRestantes[0]) {
      setNovoContratadoData(recursosRestantes[0]);
      setShouldRenderContratadoForm(true);
      setShowContratadoForm(true);
    } else {
      setShowContratadoForm(false);
      
      if (!estadoImportacao) {
        toast.error("Erro interno: estado de importação perdido.");
        setIsLoading(false);
        return;
      }

      const mapaFinal = new Map(mapaContratadosCriados);
      mapaFinal.set(nomeOriginal, novoUserId);

      const workpackagesAtualizados = estadoImportacao.workpackages.map(wp => ({
        ...wp,
        recursos: wp.recursos.map(recurso => {
          if (recurso.userId) return recurso; 

          const novoIdMapeado = mapaFinal.get(recurso.nome);
          if (novoIdMapeado) {
            return {
              ...recurso,
              userId: novoIdMapeado
            };
          } else {
             return recurso;
          }
        })
      }));

      setEstadoImportacao(prev => {
        if (!prev) return null;
        return {
          ...prev,
          workpackages: workpackagesAtualizados as WorkpackageSimples[]
        };
      });

      setMapaContratadosCriados(new Map());
      setProcessamentoPendente(true);
    }
  }, [
      estadoImportacao, 
      recursosNaoAssociados, 
      novoContratadoData, 
      mapaContratadosCriados
  ]);

  const handleFinanciamentoCriado = useCallback((financiamento: FinanciamentoAPI) => {
    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        financiamentoId: financiamento.id,
        overhead: new Decimal(Number(financiamento.overhead).toFixed(2)),
        taxa_financiamento: new Decimal(Number(financiamento.taxa_financiamento).toFixed(2)),
        valor_eti: new Decimal(Number(financiamento.valor_eti).toFixed(2)),
      },
    });

    setDadosFinanciamento(null);
    setModalFinanciamentosAberto(false);
  }, [dispatch]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg">
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md z-[1001] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-&lsqb;state=closed&rsqb;:slide-out-to-top-&lsqb;48%&rsqb data-[state=open]:slide-in-from-left-1/2 data-&lsqb;state=open&rsqb;:slide-in-from-top-&lsqb;48%&rsqb;">
          <DialogHeader>
            <DialogTitle className="text-center">Importar Projeto a partir de Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-azul/30 p-6">
              <FileSpreadsheet className="mb-3 h-12 w-12 text-azul/70" />

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />

              <Button
                className="mt-2 bg-azul hover:bg-azul/90"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="-ml-1 mr-3 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    A processar...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Ficheiro Excel
                  </span>
                )}
              </Button>
              <p className="mt-2 text-center text-sm text-azul/60">
                Selecione um ficheiro Excel com o formato correto para importar automaticamente os
                dados do projeto
              </p>
            </div>

            <div className="flex items-center justify-center text-sm text-azul/70">
              <ExternalLink className="mr-1 h-4 w-4" />
              <a
                href="/templates/modelo_projeto.xlsx"
                className="underline hover:text-azul"
                download
              >
                Descarregar modelo de exemplo
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {shouldRenderContratadoForm && showContratadoForm && novoContratadoData && (
        <FormContratado
          defaultValues={{
            identificacao: novoContratadoData.nome,
            salario: novoContratadoData.salario?.toString() || ""
          }}
          onSuccess={handleContratadoCriado}
          open={showContratadoForm}
          onOpenChange={(newOpen) => {
            setShowContratadoForm(newOpen);
            if (!newOpen) {
              setTimeout(() => {
                setShouldRenderContratadoForm(false);
              }, 300);
            }
          }}
        />
      )}

      {modalFinanciamentosAberto && (
        <GerirFinanciamentosModal
          open={modalFinanciamentosAberto}
          onOpenChange={setModalFinanciamentosAberto}
          dadosPreenchidos={{
            nome: dadosFinanciamento?.nome || "",
            overhead: dadosFinanciamento?.overhead || null,
            taxa_financiamento: dadosFinanciamento?.taxa_financiamento || null,
            valor_eti: dadosFinanciamento?.valor_eti || null,
          }}
          onFinanciamentoCriado={handleFinanciamentoCriado}
        />
      )}
    </>
  );
}