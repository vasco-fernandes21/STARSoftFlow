"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import { toast } from "sonner";
import { Decimal } from "decimal.js";

export default function TestButton() {
  const { state, dispatch } = useProjetoForm();
  const [count, setCount] = useState(1);

  const handleClick = () => {
    // Verifica o estado atual
    console.log("Estado atual antes:", JSON.stringify(state));
    
    // Reset do estado para garantir um começo limpo
    dispatch({ type: "RESET" });
    
    // Atualiza um campo simples para ver se funciona
    dispatch({ 
      type: "UPDATE_FIELD", 
      field: "nome", 
      value: `Projeto Teste ${count}` 
    });
    
    // Adiciona um workpackage simples
    const wpId = crypto.randomUUID();
    
    dispatch({
      type: "ADD_WORKPACKAGE",
      workpackage: {
        id: wpId,
        nome: `Workpackage Teste ${count}`,
        descricao: "Teste de funcionamento do contexto",
        inicio: new Date(),
        fim: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        estado: false,
        tarefas: [],
        materiais: [
          {
            id: Math.floor(Math.random() * 1000000),
            nome: "Material de Teste",
            preco: new Decimal(100),
            quantidade: 1,
            ano_utilizacao: new Date().getFullYear(),
            rubrica: "MATERIAIS",
            workpackageId: wpId
          }
        ],
        recursos: []
      }
    });
    
    // Incrementa o contador para próximos testes
    setCount(prev => prev + 1);
    
    // Verifica o estado após as atualizações
    console.log("Estado após dispatch:", JSON.stringify(state));
    
    // Usa um setTimeout para verificar o estado após algum tempo
    setTimeout(() => {
      console.log("Estado após timeout:", JSON.stringify(state));
      toast.success("Teste de contexto executado. Verifique o console.");
    }, 100);
  };

  return (
    <Button 
      className="bg-purple-600 hover:bg-purple-700 text-white"
      onClick={handleClick}
    >
      Testar Contexto ({count})
    </Button>
  );
}
