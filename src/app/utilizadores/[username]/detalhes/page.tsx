'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { api } from '@/trpc/react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// Interface para o utilizador
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  permissao?: string;
  regime?: string;
  foto?: string | null;
}

// Formato seguro para o estado do workpackage
const formatEstado = (estado: any): string => {
  // Verificar se estado é um enum ProjetoEstado
  if (estado === 'RASCUNHO' || 
      estado === 'PENDENTE' || 
      estado === 'APROVADO' || 
      estado === 'EM_DESENVOLVIMENTO' || 
      estado === 'CONCLUIDO') {
    // Substituir underscore por espaço e formatar
    return estado.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  
  // Se for um booleano (como no schema)
  if (typeof estado === 'boolean') {
    return estado ? 'Concluído' : 'Em Progresso';
  }
  
  // Para qualquer outro caso, converter para string
  return String(estado);
};

const UserWorkDetailsPage = () => {
  const params = useParams();
  const username = params.username as string;
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Buscar dados do utilizador pelo username
  const { 
    data: userData, 
    isLoading: isLoadingUser, 
    error: userError 
  } = api.utilizador.getByUsername.useQuery(username);

  // Buscar projetos do utilizador quando tivermos o ID
  const { 
    data: projetos, 
    isLoading: isLoadingProjetos 
  } = api.utilizador.getProjetosWithUser.useQuery(
    userData?.id || '', 
    { 
      enabled: !!userData?.id,
      onSuccess: (data) => {
        console.log("Projetos carregados:", data);
      },
      onError: (error) => {
        console.error("Erro ao carregar projetos:", error);
      }
    }
  );

  // Buscar relatórios mensais
  const { 
    data: relatoriosMensais, 
    isLoading: isLoadingRelatorios 
  } = api.utilizador.getOcupacaoMensal.useQuery({
    userId: userData?.id || '',
    ano: selectedYear
  }, {
    enabled: !!userData?.id
  });

  // Buscar resumo de ocupação
  const { 
    data: resumoOcupacao, 
    isLoading: isLoadingResumo 
  } = api.utilizador.getResumoOcupacao.useQuery({
    userId: userData?.id || ''
  }, {
    enabled: !!userData?.id
  });

  // Meses disponíveis para seleção
  const availableMonths = [
    { value: 'all', label: 'Todos' },
    ...Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const date = new Date(selectedYear, i, 1);
      return {
        value: `${selectedYear}-${month < 10 ? '0' + month : month}`,
        label: format(date, 'MMMM yyyy', { locale: pt })
      };
    })
  ];

  // Anos disponíveis para seleção
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Efeito para atualizar estado de carregamento
  useEffect(() => {
    setIsLoading(
      isLoadingUser || 
      (!!userData?.id && (isLoadingProjetos || isLoadingRelatorios || isLoadingResumo))
    );
  }, [isLoadingUser, isLoadingProjetos, isLoadingRelatorios, isLoadingResumo, userData]);

  // Filtrar projetos por mês selecionado
  const filteredProjetos = selectedMonth && selectedMonth !== 'all' && projetos
    ? projetos.map(projeto => {
        const [year, month] = selectedMonth.split('-').map(Number);
        
        return {
          ...projeto,
          workpackages: projeto.workpackages.filter(wp => {
            // Verificar se há alocações para o mês selecionado
            return wp.alocacoes.some(a => a.ano === year && a.mes === month);
          })
        };
      }).filter(projeto => projeto.workpackages.length > 0)
    : projetos || [];

  // Encontrar relatório para o mês selecionado
  const selectedReport = selectedMonth && selectedMonth !== 'all' && relatoriosMensais
    ? relatoriosMensais.find(report => {
        const [year, month] = selectedMonth.split('-').map(Number);
        return report.mes === month;
      })
    : null;

  // Calcular o valor máximo de ocupação para escala da visualização
  const maxOcupacao = relatoriosMensais 
    ? Math.max(...relatoriosMensais.map(report => report.ocupacaoTotal * 100), 100)
    : 100;

  if (userError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Utilizador não encontrado</h2>
          <p className="text-gray-600">Não foi possível encontrar o utilizador "{username}"</p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>A carregar dados do utilizador...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Detalhes de Trabalho</h1>
              <p className="text-gray-600">
                Utilizador: {userData?.name} ({userData?.username})
                {userData?.permissao && (
                  <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {userData.permissao}
                  </span>
                )}
                {userData?.regime && (
                  <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {userData.regime}
                  </span>
                )}
              </p>
              <p className="text-gray-500 text-sm">{userData?.email}</p>
            </div>
            
            {resumoOcupacao && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Resumo</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Ocupação Média Anual:</p>
                    <p className="font-bold">{Math.round(resumoOcupacao.ocupacaoMediaAnual * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ocupação Mês Atual:</p>
                    <p className="font-bold">{Math.round(resumoOcupacao.ocupacaoMesAtual * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Projetos Ativos:</p>
                    <p className="font-bold">{resumoOcupacao.projetosAtivos}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Capacidade:</p>
                    <p className="font-bold">{Math.round(resumoOcupacao.capacidadeMaxima * 100)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Selecionar ano" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedMonth || 'all'} 
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => setSelectedMonth('all')}
              >
                Ver Todos
              </Button>
            </div>
          </div>

          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="projects">Projetos</TabsTrigger>
              <TabsTrigger value="reports">Relatórios Mensais</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>
            
            <TabsContent value="projects">
              {filteredProjetos.length > 0 ? (
                <div className="space-y-6">
                  {filteredProjetos.map(projeto => (
                    <Card key={projeto.id} className="mb-6">
                      <CardHeader>
                        <CardTitle className="flex justify-between">
                          <span>{projeto.nome}</span>
                          <span className="text-sm font-normal text-gray-500">
                            Ocupação Média: {Math.round(projeto.ocupacaoMedia * 100)}%
                          </span>
                        </CardTitle>
                        <p className="text-gray-600">{projeto.descricao}</p>
                        <p className="text-sm text-gray-500">
                          Período: {format(new Date(projeto.inicio), 'dd/MM/yyyy')} - {format(new Date(projeto.fim), 'dd/MM/yyyy')}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <h3 className="text-lg font-semibold mb-3">Pacotes de Trabalho</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Período</TableHead>
                              <TableHead className="text-right">Ocupação Média</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projeto.workpackages.map(wp => (
                              <TableRow key={wp.id}>
                                <TableCell className="font-medium">{wp.nome}</TableCell>
                                <TableCell>{wp.descricao}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    wp.estado === true || wp.estado === 'CONCLUIDO' 
                                      ? 'bg-green-100 text-green-800' 
                                      : wp.estado === false || wp.estado === 'EM_DESENVOLVIMENTO' || wp.estado === 'APROVADO'
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {formatEstado(wp.estado)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(wp.inicio), 'dd/MM/yyyy')} - {format(new Date(wp.fim), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                  {wp.alocacoes.length > 0 
                                    ? Math.round((wp.alocacoes.reduce((sum, a) => sum + Number(a.ocupacao), 0) / wp.alocacoes.length) * 100)
                                    : 0}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p>Nenhum projeto encontrado para o período selecionado.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="reports">
              {selectedMonth && selectedMonth !== 'all' && selectedReport ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Relatório de {selectedReport.mesNome} {selectedYear}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">
                        Ocupação Total: {Math.round(selectedReport.ocupacaoTotal * 100)}%
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Pacote de Trabalho</TableHead>
                          <TableHead className="text-right">Ocupação</TableHead>
                          <TableHead className="text-right">Percentagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReport.detalhes.map((detalhe, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{detalhe.projeto}</TableCell>
                            <TableCell>{detalhe.workpackage}</TableCell>
                            <TableCell className="text-right">{Math.round(detalhe.ocupacao * 100)}%</TableCell>
                            <TableCell className="text-right">
                              {selectedReport.ocupacaoTotal > 0 
                                ? Math.round((detalhe.ocupacao / selectedReport.ocupacaoTotal) * 100)
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {relatoriosMensais?.map(report => (
                    <Card key={report.mes}>
                      <CardHeader>
                        <CardTitle className="flex justify-between">
                          <span>Relatório de {report.mesNome} {selectedYear}</span>
                          <span className="text-sm font-normal text-gray-500">
                            Ocupação Total: {Math.round(report.ocupacaoTotal * 100)}%
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Projeto</TableHead>
                              <TableHead>Pacote de Trabalho</TableHead>
                              <TableHead className="text-right">Ocupação</TableHead>
                              <TableHead className="text-right">Percentagem</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.detalhes.map((detalhe, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{detalhe.projeto}</TableCell>
                                <TableCell>{detalhe.workpackage}</TableCell>
                                <TableCell className="text-right">{Math.round(detalhe.ocupacao * 100)}%</TableCell>
                                <TableCell className="text-right">
                                  {report.ocupacaoTotal > 0 
                                    ? Math.round((detalhe.ocupacao / report.ocupacaoTotal) * 100)
                                    : 0}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Ocupação por Mês ({selectedYear})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex flex-col justify-center">
                      {relatoriosMensais && relatoriosMensais.length > 0 ? (
                        <div className="space-y-4">
                          {relatoriosMensais.map(report => {
                            const ocupacaoPercent = Math.round(report.ocupacaoTotal * 100);
                            const barWidth = `${(ocupacaoPercent / maxOcupacao) * 100}%`;
                            
                            return (
                              <div key={report.mes} className="flex items-center">
                                <div className="w-24 text-sm font-medium">{report.mesNome}</div>
                                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: barWidth }}
                                  ></div>
                                </div>
                                <div className="w-16 text-right text-sm ml-2">{ocupacaoPercent}%</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          Sem dados de ocupação para mostrar
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo de Projetos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Pacotes de Trabalho</TableHead>
                          <TableHead className="text-right">Ocupação Média</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjetos.map(projeto => (
                          <TableRow key={projeto.id}>
                            <TableCell className="font-medium">{projeto.nome}</TableCell>
                            <TableCell>{projeto.workpackages.length}</TableCell>
                            <TableCell className="text-right">{Math.round(projeto.ocupacaoMedia * 100)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Estado dos Pacotes de Trabalho</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Pacote de Trabalho</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">Ocupação Média</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjetos.flatMap(projeto => 
                          projeto.workpackages.map(wp => (
                            <TableRow key={`${projeto.id}-${wp.id}`}>
                              <TableCell className="font-medium">{projeto.nome}</TableCell>
                              <TableCell>{wp.nome}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  wp.estado === true || wp.estado === 'CONCLUIDO' 
                                    ? 'bg-green-100 text-green-800' 
                                    : wp.estado === false || wp.estado === 'EM_DESENVOLVIMENTO' || wp.estado === 'APROVADO'
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {formatEstado(wp.estado)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {format(new Date(wp.inicio), 'dd/MM/yyyy')} - {format(new Date(wp.fim), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-right">
                                {wp.alocacoes.length > 0 
                                  ? Math.round((wp.alocacoes.reduce((sum, a) => sum + Number(a.ocupacao), 0) / wp.alocacoes.length) * 100)
                                  : 0}%
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default UserWorkDetailsPage; 