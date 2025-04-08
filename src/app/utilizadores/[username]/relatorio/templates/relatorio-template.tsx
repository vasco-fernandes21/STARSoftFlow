import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WorkPackage {
  id: string;
  nome: string;
  horas: number;
  ocupacao: number;
}

interface Projeto {
  nome: string;
  workpackages: WorkPackage[];
  horasTotal: number;
}

interface RelatorioTemplateProps {
  data: {
    utilizador: {
      id: string;
      nome: string;
      email: string;
      cargo: string;
    };
    configuracaoMensal: {
      diasUteis: number;
      horasPotenciais: number;
    };
    estatisticas: {
      tarefasCompletadas: number;
      tarefasPendentes: number;
      horasTrabalhadas: number;
      produtividade: number;
    };
    alocacoes: Array<{
      workpackageId: string;
      workpackageNome: string;
      projetoId: string;
      projetoNome: string;
      ocupacao: number;
    }>;
    atividades: Array<{
      data: Date;
      descricao: string;
      tipo: "tarefa" | "projeto" | "reunião";
      duracao: number;
    }>;
  };
  date: Date;
}

export function RelatorioTemplate({ data, date }: RelatorioTemplateProps) {
  // Agrupar projetos e workpackages
  const projetos = new Map<string, Projeto>();
  data.alocacoes.forEach(alocacao => {
    if (!projetos.has(alocacao.projetoId)) {
      projetos.set(alocacao.projetoId, {
        nome: alocacao.projetoNome,
        workpackages: [],
        horasTotal: 0
      });
    }
    
    const projeto = projetos.get(alocacao.projetoId)!;
    const horasAlocadas = alocacao.ocupacao * data.configuracaoMensal.horasPotenciais;
    
    projeto.workpackages.push({
      id: alocacao.workpackageId,
      nome: alocacao.workpackageNome,
      horas: horasAlocadas,
      ocupacao: alocacao.ocupacao
    });
    
    projeto.horasTotal += horasAlocadas;
  });
  
  // Formatação do mês para o título
  const mesFormatado = format(date, "MMM/yy", { locale: ptBR }).toUpperCase();
  
  return (
    <div className="font-sans p-6 max-w-none">
      {/* Cabeçalho com logo */}
      <div className="flex justify-center mb-8">
        <img 
          src="/logo-star.png" 
          alt="STAR Institute" 
          className="h-16"
          style={{ objectFit: 'contain' }}
        />
      </div>
      
      <div className="mb-8">
        <h1 className="text-xl font-bold">Registo de horas PROJETOS</h1>
        <h2 className="text-lg">{data.utilizador.nome}</h2>
      </div>
      
      <div className="mb-6 flex justify-end">
        <div className="border border-black px-4 py-2 text-center min-w-[200px]">
          <p className="uppercase font-bold">PERÍODO DE REPORTE</p>
          <p>{mesFormatado}</p>
        </div>
      </div>
      
      {/* Tabela principal */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 p-2 text-center">Jornada diária</th>
            <th className="border border-gray-400 p-2 text-center">Nº de dias úteis trabalháveis</th>
            <th className="border border-gray-400 p-2 text-center">Horas trabalháveis potenciais</th>
            <th className="border border-gray-400 p-2 text-center">Férias e outras ausências</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 p-2 text-center">8.00</td>
            <td className="border border-gray-400 p-2 text-center">{data.configuracaoMensal.diasUteis}</td>
            <td className="border border-gray-400 p-2 text-center">{data.configuracaoMensal.horasPotenciais.toFixed(2)}</td>
            <td className="border border-gray-400 p-2 text-center">0.00</td>
          </tr>
        </tbody>
      </table>
      
      {/* Tabela de projetos */}
      <table className="w-full border-collapse">
        <tbody>
          {Array.from(projetos.values()).map((projeto, index) => (
            <>
              {/* Linha de projeto com total */}
              <tr key={`projeto-${index}`} className="bg-gray-100">
                <td colSpan={3} className="border border-gray-400 p-2 font-bold">
                  {projeto.nome}
                </td>
                <td className="border border-gray-400 p-2 text-right font-bold">
                  TOTAL {projeto.nome.split(' ')[0]}
                </td>
                <td className="border border-gray-400 p-2 text-right font-bold">
                  {projeto.horasTotal.toFixed(2)}
                </td>
              </tr>
              
              {/* Linhas de workpackages */}
              {projeto.workpackages.map((wp: WorkPackage, wpIndex: number) => (
                <tr key={`wp-${index}-${wpIndex}`}>
                  <td className="border border-gray-400 p-2 pl-8" colSpan={3}>
                    {wp.nome}
                  </td>
                  <td className="border border-gray-400 p-2 text-right">
                    IDT: TRL 5-7
                  </td>
                  <td className="border border-gray-400 p-2 text-right">
                    {wp.horas.toFixed(2)}
                  </td>
                </tr>
              ))}
            </>
          ))}
          
          {/* Linha de total global */}
          <tr className="bg-gray-200 font-bold">
            <td colSpan={3} className="border border-gray-400 p-2 text-center">
              TOTAL GLOBAL
            </td>
            <td className="border border-gray-400 p-2 text-right">
              {data.configuracaoMensal.horasPotenciais.toFixed(2)}
            </td>
            <td className="border border-gray-400 p-2 text-right">
              {data.estatisticas.horasTrabalhadas.toFixed(2)}
            </td>
          </tr>
          
          {/* Linha de Controlo */}
          <tr>
            <td colSpan={5} className="border border-gray-400 p-2 text-center">
              Controlo
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Rodapé com assinatura */}
      <div className="mt-12">
        <div className="flex justify-between">
          <div>
            <p>Rubrica do(a) Técnico(a): _______________________________</p>
          </div>
          <div>
            <p>Assinado por: {data.utilizador.nome.toUpperCase()}</p>
            <p>Num. de Identificação: {data.utilizador.id}</p>
            <p>Data: {format(new Date(), "yyyy-MM-dd HH:mm:ssxxx")}</p>
          </div>
        </div>
      </div>
      
      {/* Logos de rodapé */}
      <div className="mt-12 flex justify-center space-x-6">
        <img src="/logo-prr.png" alt="PRR" className="h-12" />
        <img src="/logo-pt.png" alt="Portugal" className="h-12" />
        <img src="/logo-ue.png" alt="União Europeia" className="h-12" />
        <img src="/logo-outros.png" alt="Outros" className="h-12" />
      </div>
    </div>
  );
} 