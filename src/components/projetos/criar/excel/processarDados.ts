import { WorkpackageData, RecursoAlocacao, ProcessedData } from './types';
import { calcularDataInicio, calcularDataFim } from './calcularDatas';

export const processarDados = (data: any[][]): ProcessedData => {
  // Ignorar as primeiras 5 linhas (cabeçalhos)
  const linhasDados = data.slice(5);
  
  const workpackages: WorkpackageData[] = [];
  const alocacoes: { [key: string]: RecursoAlocacao } = {};
  
  // Extrair anos das colunas (linha 4, começando da coluna 6)
  const anos = data[4]?.slice(5) || [];
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);
  
  let workpackageAtual = '';
  
  linhasDados.forEach((row, index) => {
    if (!row[1] && !row[2]) return; // Ignorar linhas vazias
    
    // Se é uma linha de workpackage (começa com A1, A2, etc.)
    if (row[1]?.match(/^A\d+$/)) {
      workpackageAtual = row[2] || ''; // Nome do workpackage
      
      workpackages.push({
        id: `wp-${row[1]}`,
        nome: workpackageAtual,
        descricao: null,
        inicio: calcularDataInicio(row[4] || 1),
        fim: calcularDataFim(row[4] || 1, row[5] || 12),
        estado: "RASCUNHO",
        recursos: []
      });
      
      return;
    }
    
    // Se é uma linha de recurso
    if (row[3] && workpackageAtual) {
      const nomeRecurso = row[3];
      
      // Inicializar recurso se não existir
      if (!alocacoes[nomeRecurso]) {
        alocacoes[nomeRecurso] = {
          nome: nomeRecurso,
          alocacoes: {},
          totaisPorAno: {}
        };
      }
      
      // Inicializar alocações para este workpackage
      if (!alocacoes[nomeRecurso].alocacoes[workpackageAtual]) {
        alocacoes[nomeRecurso].alocacoes[workpackageAtual] = [];
      }
      
      // Processar alocações (começam na coluna 6)
      row.slice(5).forEach((valor, i) => {
        if (typeof valor === 'number' && valor > 0) {
          const ano = anos[i];
          const mes = (i % 12) + 1;
          
          // Adicionar à lista de alocações do recurso
          alocacoes[nomeRecurso].alocacoes[workpackageAtual].push({
            mes,
            ano,
            ocupacao: valor
          });
          
          // Atualizar totais por ano
          alocacoes[nomeRecurso].totaisPorAno[ano] = 
            (alocacoes[nomeRecurso].totaisPorAno[ano] || 0) + valor;
          
          // Adicionar ao workpackage atual
          const wp = workpackages.find(w => w.nome === workpackageAtual);
          if (wp) {
            wp.recursos.push({
              userId: nomeRecurso,
              mes,
              ano,
              ocupacao: valor
            });
          }
        }
      });
    }
  });
  
  return { workpackages, alocacoes };
};
