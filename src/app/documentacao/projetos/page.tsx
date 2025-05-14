"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Search,
  ArrowLeft,
  FileText,
  HelpCircle,
  Package,
  Clock,
  ListChecks,
  BarChart3,
  CheckCircle2,
  Workflow,
  GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

// Define interfaces for type safety
interface TabItem {
  label: string;
  description: string;
  access?: string;
}

interface Interaction {
  title: string;
  description: string;
  actions: string[];
}

interface TopicItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  link: { label: string; href: string };
  features?: string[];
  steps?: string[];
  tabs?: TabItem[];
  interactions?: Interaction[];
}

export default function ProjetosDocumentacao() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const baseURL = process.env.NEXT_PUBLIC_BLOB_URL;
  
  const projetoTopics: TopicItem[] = [
    {
      id: "listagem",
      title: "Como Consultar e Filtrar Projetos",
      description: "Nesta página, encontrará todos os projetos e rascunhos disponíveis para o seu perfil. Aqui pode visualizar, filtrar e aceder aos seus projetos.",
      icon: <FileText className="h-8 w-8 text-azul" />,
      features: [
        "Pesquisa: Digite palavras-chave na barra de pesquisa para encontrar projetos específicos",
        "Filtros: Utilize os filtros predefinidos (ex: Em curso, Concluído, Pendente) para organizar a visualização",
        "Ordenação: Clique nos cabeçalhos das colunas para ordenar por nome, data ou estado",
        "Ações Rápidas: Botões de ação permitem criar novo projeto, editar, duplicar ou ver detalhes"
      ],
      image: "/docs/projects-list.jpg",
      link: { label: "Aceder à Lista de Projetos", href: "/projetos" }
    },
    {
      id: "criacao",
      title: "Como Criar um Novo Projeto",
      description: "Para criar um projeto, clique no botão '+ Novo Projeto' na página de listagem. O processo está dividido em etapas sequenciais para facilitar o preenchimento de todas as informações necessárias.",
      icon: <Package className="h-8 w-8 text-azul" />,
      tabs: [
        { label: "1. Informações", description: "Preencha o nome, a descrição, as datas de início/fim e escolha o responsável do projeto" },
        { label: "2. Finanças", description: "Introduza o orçamento total, distribua os valores por categorias e adicione fontes de financiamento" },
        { label: "3. Workpackages", description: "Crie a estrutura do projeto adicionando workpackages, tarefas e entregáveis com o botão '+'" },
        { label: "4. Recursos", description: "Adicione membros da equipa e defina a sua percentagem de alocação ao projeto" },
        { label: "5. Materiais", description: "Especifique equipamentos e serviços com os respetivos custos e fornecedores" },
        { label: "6. Resumo", description: "Verifique todas as informações e submeta o projeto clicando em 'Criar Projeto'" }
      ],
      image: "/docs/create-project.jpg",
      link: { label: "Criar Novo Projeto", href: "/projetos/criar" }
    },
    {
      id: "rascunhos",
      title: "Como Utilizar e Gerir Rascunhos",
      description: "Durante a criação de um projeto, pode guardá-lo como rascunho a qualquer momento para continuar mais tarde. Para tal, clique no botão 'Guardar como Rascunho' em qualquer etapa do processo.",
      icon: <Clock className="h-8 w-8 text-azul" />,
      steps: [
        "Guardar Rascunho: Clique em 'Guardar como Rascunho' durante a criação do projeto",
        "Aceder aos Rascunhos: Na página principal de projetos, encontre-os identificados com o ícone de rascunho",
        "Retomar Edição: Clique no rascunho e continue a partir da etapa onde parou",
        "Eliminar Rascunho: Se já não necessitar dele, clique nos três pontos do rascunho e selecione 'Eliminar'"
      ],
      image: "/docs/drafts.jpg",
      link: { label: "Ver os Meus Rascunhos", href: "/projetos" }
    },
    {
      id: "importacao",
      title: "Como Importar Projetos de Excel",
      description: "Para migrar projetos de outras plataformas, utilize a funcionalidade de importação. Aceda a esta opção através do menu 'Importar' na barra lateral ou do botão 'Importar Projeto' na página de listagem.",
      icon: <FileText className="h-8 w-8 text-azul" />,
      features: [
        "Preparação: Descarregue o modelo de Excel clicando em 'Descarregar Modelo' na página de importação",
        "Preenchimento: Preencha o modelo com os dados do seu projeto, seguindo as instruções de cada coluna",
        "Importação: Clique em 'Carregar Ficheiro' e selecione o seu ficheiro Excel preenchido",
        "Validação: Verifique os dados detetados e efetue os ajustes necessários antes de confirmar"
      ],
      image: "/docs/import-excel.jpg",
      link: { label: "Importar um Projeto", href: "/importar" }
    },
    {
      id: "detalhes",
      title: "Como Gerir e Acompanhar Projetos Ativos",
      description: "Após criar ou selecionar um projeto, aceda à sua página de detalhes onde pode acompanhar o progresso e efetuar atualizações. Navegue entre as diferentes visualizações utilizando as abas superiores.",
      icon: <CheckCircle2 className="h-8 w-8 text-azul" />,
      tabs: [
        { label: "Visão Geral", description: "Mostra o resumo do projeto, a percentagem de conclusão e os próximos marcos", access: "Todos os utilizadores com acesso ao projeto" },
        { label: "Cronograma", description: "Apresenta a linha do tempo com todas as atividades, onde pode arrastar para ajustar as datas", access: "Todos os utilizadores com acesso ao projeto" },
        { label: "Materiais e Serviços", description: "Lista os recursos necessários, permite adicionar/editar com o botão '+'", access: "ADMIN, GESTOR ou responsável pelo projeto" },
        { label: "Finanças", description: "Mostra o orçamento vs. gastos reais, permite inserir despesas efetuadas", access: "ADMIN, GESTOR ou responsável pelo projeto" }
      ],
      interactions: [
        { 
          title: "Ações em Workpackages", 
          description: "Para gerir um workpackage, clique nele no cronograma e escolha uma opção:",
          actions: [
            "Editar: Altere as datas, o título ou a descrição com 'Editar Workpackage'",
            "Tarefas: Adicione ou modifique tarefas com '+ Nova Tarefa'",
            "Entregáveis: Defina os resultados esperados com '+ Novo Entregável'",
            "Recursos: Ajuste as alocações da equipa com 'Gerir Recursos'",
            "Materiais: Adicione equipamentos e serviços com 'Adicionar Material'"
          ]
        },
        {
          title: "Ações em Tarefas",
          description: "Para gerir uma tarefa, clique nela no cronograma ou na lista e selecione:",
          actions: [
            "Editar: Modifique os detalhes com 'Editar Tarefa'",
            "Progresso: Atualize o estado utilizando o seletor 'Estado da Tarefa'",
            "Ficheiros: Adicione documentos com 'Carregar Ficheiro'",
            "Comentários: Comunique com a equipa na secção 'Comentários'",
            "Eliminar: Remova a tarefa com 'Eliminar' (requer confirmação)"
          ]
        }
      ],
      image: "/docs/project-details.jpg",
      link: { label: "Ver Projetos Ativos", href: "/projetos" }
    }
  ];

  const filteredTopics = searchQuery.trim()
    ? projetoTopics.filter(topic => 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projetoTopics;

  return (
    <div className="min-h-screen bg-bgApp">
      {/* Header */}
      <header className="bg-azul text-white py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/documentacao")}
                className="rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Image
                  src="/star-logo-branco.png"
                  alt="STAR Institute"
                  width={120}
                  height={40}
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold">Documentação de Projetos</span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="hover:bg-white/10"
                onClick={() => router.push("/feedback")}
              >
                Suporte
              </Button>
              <Button 
                variant="outline" 
                className="border-white border-2 text-white bg-transparent hover:bg-white/10 rounded-full"
                onClick={() => router.push("/login")}
              >
                Aceder à Plataforma
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Documentação Integrada de Projetos
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-600 mb-8"
            >
              Guia completo do sistema de gestão de projetos no ecossistema de inovação StarSoftFlow
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-xl mx-auto"
            >
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Pesquisar nesta documentação..."
                className="pl-10 h-12 rounded-lg border-gray-300 shadow-sm focus:border-azul focus:ring-azul"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Topics Overview */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Ecossistema de Gestão de Projetos</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <BarChart3 className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Concepção e Planeamento</h3>
                  <p className="text-gray-600 mb-4">
                    Domine as funcionalidades avançadas para criar, configurar e planear projetos com precisão e eficiência
                  </p>
                  <Link href="#criacao" className="flex items-center text-azul font-medium">
                    <span>Explorar capacidades</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <Workflow className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Estruturação e Execução</h3>
                  <p className="text-gray-600 mb-4">
                    Aprenda a organizar hierarquicamente os projetos e a gerir eficazmente a sua implementação operacional
                  </p>
                  <Link href="#detalhes" className="flex items-center text-azul font-medium">
                    <span>Descobrir metodologias</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <GitBranch className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Produtividade Avançada</h3>
                  <p className="text-gray-600 mb-4">
                    Utilize ferramentas especializadas para otimizar processos, importar dados e maximizar a eficácia da gestão
                  </p>
                  <Link href="#importacao" className="flex items-center text-azul font-medium">
                    <span>Conhecer ferramentas</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Detailed Topics */}
      {filteredTopics.map((topic, topicIndex) => (
        <section 
          id={topic.id} 
          key={topicIndex}
          className={`py-12 ${topicIndex % 2 === 0 ? 'bg-white' : 'bg-bgApp'}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row gap-8 items-stretch"
              >
                <div className="md:w-1/2 order-2 md:order-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-azul/10 p-2 rounded-lg">
                      {topic.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{topic.title}</h2>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{topic.description}</p>
                  
                  {topic.features && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Como fazer:</h3>
                      <ul className="space-y-2">
                        {topic.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {topic.steps && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Passo a passo:</h3>
                      <ol className="space-y-2 list-decimal ml-5">
                        {topic.steps.map((step, idx) => (
                          <li key={idx} className="text-gray-700 pl-1">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {topic.tabs && !topic.interactions && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {topic.id === 'criacao' ? 'Instruções por etapa:' : 'Abas disponíveis:'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {topic.tabs.map((tab, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium text-azul">{tab.label}</h4>
                            <p className="text-sm text-gray-600">{tab.description}</p>
                            {tab.access && (
                              <p className="text-xs text-gray-500 mt-1">Quem pode aceder: {tab.access}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topic.interactions && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">O que pode fazer:</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {topic.interactions.map((interaction, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-azul">{interaction.title}</h4>
                            <p className="text-sm text-gray-600 mt-2">{interaction.description}</p>
                            <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc pl-4">
                              {interaction.actions.map((action, actionIdx) => (
                                <li key={actionIdx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topic.id === 'detalhes' && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Aprovação de Projetos:</h3>
                      <div>
                        <p className="text-gray-700">
                          Para aprovar um projeto <span className="font-medium">PENDENTE</span>:
                        </p>
                        <ol className="list-decimal ml-5 mt-2 text-gray-700">
                          <li className="mt-1">Aceda ao projeto com estado "Pendente"</li>
                          <li className="mt-1">Clique no botão "Avaliar Projeto" no topo da página</li>
                          <li className="mt-1">Selecione "Aprovar" ou "Rejeitar" no diálogo</li>
                          <li className="mt-1">Adicione comentários se necessário</li>
                          <li className="mt-1">Confirme a sua decisão</li>
                        </ol>
                        <p className="text-xs block mt-2 text-gray-700">
                          Nota: Esta função está disponível apenas para utilizadores com perfil GESTOR ou ADMIN.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-auto">
                    {topic.link && (
                      <Button 
                        onClick={() => router.push(topic.link.href)}
                        className="bg-azul text-white hover:bg-azul-dark rounded-full"
                      >
                        {topic.link.label}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="md:w-1/2 order-1 md:order-2 flex items-center">
                      <div className="rounded-lg overflow-hidden shadow-md bg-white border border-gray-200 w-full">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-500">Imagem ilustrativa: {topic.title}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}
      
      {/* Need Help Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Precisa de ajuda adicional?</h2>
            <p className="text-gray-600 mb-8">
              Se não encontrou o que procura, entre em contacto com a nossa equipa de suporte.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline"
                onClick={() => router.push("/feedback")}
                className="border-azul text-azul hover:bg-azul/5 rounded-full"
              >
                <HelpCircle className="mr-2 h-5 w-5" />
                Contactar Suporte
              </Button>
              <Button 
                onClick={() => router.push("/tutoriais")}
                className="bg-azul text-white hover:bg-azul-dark rounded-full"
              >
                <FileText className="mr-2 h-5 w-5" />
                Ver Tutoriais
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image
                src="/star-logo-branco.png"
                alt="STAR Institute"
                width={100}
                height={30}
                className="h-6 w-auto"
              />
              <span className="text-white font-medium">Documentação</span>
            </div>
            <div className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} STAR Institute. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 