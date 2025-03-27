import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TextField, TextareaField, DateField } from "@/components/projetos/criar/components/FormFields";
import { useMutations } from "@/hooks/useMutations";
import type { WorkpackageCompleto } from "@/components/projetos/types";

interface WorkpackageInformacoesProps {
  workpackageId: string;
  _onClose: () => void;
  projetoId?: string;
  workpackage?: WorkpackageCompleto;
}

export function WorkpackageInformacoes({
  workpackageId,
  _onClose,
  projetoId,
  workpackage,
}: WorkpackageInformacoesProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [erros, setErros] = useState<{
    nome?: string;
    descricao?: string;
    dataInicio?: string;
    dataFim?: string;
  }>({});

  const descricaoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mutations = useMutations(projetoId);

  useEffect(() => {
    if (workpackage) {
      setNome(workpackage.nome || "");
      setDescricao(workpackage.descricao || "");
      setDataInicio(workpackage.inicio ? new Date(workpackage.inicio) : null);
      setDataFim(workpackage.fim ? new Date(workpackage.fim) : null);
    }
  }, [workpackage]);

  useEffect(() => {
    return () => {
      if (descricaoTimeoutRef.current) clearTimeout(descricaoTimeoutRef.current);
    };
  }, []);

  const validarNome = (valor: string) => {
    if (!valor.trim()) return "O nome é obrigatório";
    if (valor.trim().length < 3) return "Nome deve ter pelo menos 3 caracteres";
    return undefined;
  };

  const handleNameChange = (novoNome: string) => {
    setNome(novoNome);
    if (erros.nome) setErros((prev) => ({ ...prev, nome: undefined }));
  };

  const handleNameBlur = () => {
    const erro = validarNome(nome);
    setErros((prev) => ({ ...prev, nome: erro }));
    if (!erro) {
      mutations.workpackage.update.mutate({
        id: workpackageId,
        nome: nome,
      });
    }
  };

  const handleDescriptionChange = (novaDescricao: string) => {
    setDescricao(novaDescricao);
    if (descricaoTimeoutRef.current) clearTimeout(descricaoTimeoutRef.current);
    descricaoTimeoutRef.current = setTimeout(() => {
      mutations.workpackage.update.mutate({
        id: workpackageId,
        descricao: novaDescricao,
      });
    }, 1000);
  };

  const handleStartDateChange = (novaData: Date | null) => {
    setDataInicio(novaData);
    mutations.workpackage.update.mutate({
      id: workpackageId,
      inicio: novaData || undefined,
    });
  };

  const handleEndDateChange = (novaData: Date | null) => {
    setDataFim(novaData);
    mutations.workpackage.update.mutate({
      id: workpackageId,
      fim: novaData || undefined,
    });
  };

  if (!workpackage) {
    return <div className="py-8 text-center text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Informações</h2>
        <p className="text-sm text-gray-500">Detalhes do workpackage</p>
      </div>

      <TextField
        label="Nome"
        value={nome}
        onChange={handleNameChange}
        placeholder="Nome do workpackage"
        required
        helpText={erros.nome || ""}
        className={cn(erros.nome && "error")}
        onBlur={handleNameBlur}
      />

      <div className="grid grid-cols-2 gap-4">
        <DateField
          label="Data de início"
          value={dataInicio}
          onChange={handleStartDateChange}
          helpText={erros.dataInicio || ""}
          required
        />
        <DateField
          label="Data de conclusão"
          value={dataFim}
          onChange={handleEndDateChange}
          helpText={erros.dataFim || ""}
          required
        />
      </div>

      <TextareaField
        label="Descrição"
        value={descricao}
        onChange={handleDescriptionChange}
        placeholder="Descreva este pacote de trabalho"
        rows={4}
        helpText={erros.descricao || ""}
      />
    </div>
  );
}