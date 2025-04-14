## 2 Estado da Arte

A gestão eficiente de projetos e a alocação otimizada de recursos são cruciais para o sucesso organizacional, particularmente em entidades focadas em Investigação e Desenvolvimento (I&D). Contudo, os métodos tradicionais de gestão frequentemente enfrentam limitações significativas em termos de eficiência, precisão e visibilidade. Este capítulo examina o estado da arte nesta área, começando pelos desafios inerentes às abordagens manuais, explorando o panorama de soluções digitais disponíveis no mercado e as considerações na escolha entre ferramentas standard e desenvolvimento à medida.

### 2.1 Enquadramento Teórico e Fundamentos Académicos

O desenvolvimento de soluções digitais para a gestão de projetos e recursos requer a aplicação de uma base sólida de conhecimentos teóricos e práticos, muitos dos quais foram adquiridos durante o ciclo de estudos. As unidades curriculares de Bases de Dados I e II forneceram os fundamentos essenciais para a modelação (e.g., diagramas Entidade-Relação), gestão e consulta (utilizando SQL) de dados relacionais, competências cruciais para estruturar a informação complexa inerente a projetos, recursos e alocações. Por sua vez, as unidades de Aplicações para a Internet I e II foram instrumentais na aquisição de conhecimentos sobre o desenvolvimento web full-stack, desde as tecnologias base da web (HTML, CSS, JavaScript) até à construção de interfaces de utilizador interativas e reativas com frameworks como React, e à implementação de lógica do lado do servidor e APIs utilizando plataformas como Node.js (e frameworks como Express). Esta base de conhecimento multidisciplinar, complementada por pesquisa autónoma em tecnologias e metodologias mais recentes, é essencial para abordar os desafios técnicos da criação de ferramentas de gestão eficazes.

#### 2.1.1 Título nível 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a arcu erat. Duis accumsan nibh ante, eu faucibus nibh porta vitae. Ut viverra tempor tellus, in suscipit est semper sit amet. Suspendisse eleifend condimentum egestas. Quisque ex eros, vulputate ac sollicitudin non, convallis sit amet purus. Curabitur nunc mi, rhoncus id urna quis, auctor convallis magna. Duis pellentesque nisi nisi, non eleifend tellus semper vitae. Nullam fringilla sagittis faucibus. Integer iaculis mi lorem, eget vehicula tortor ultricies sollicitudin.

#### 2.1.2 Título nível 3

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a arcu erat. Duis accumsan nibh ante, eu faucibus nibh porta vitae. Ut viverra tempor tellus, in suscipit est semper sit amet. Suspendisse eleifend condimentum egestas. Quisque ex eros, vulputate ac sollicitudin non, convallis sit amet purus. Curabitur nunc mi, rhoncus id urna quis, auctor convallis magna. Duis pellentesque nisi nisi, non eleifend tellus semper vitae. Nullam fringilla sagittis faucibus. Integer iaculis mi lorem, eget vehicula tortor ultricies sollicitudin.

### 2.2 A Evolução para Plataformas Digitais Dedicadas

Historicamente, muitas organizações têm recorrido a métodos manuais ou ferramentas genéricas, como folhas de cálculo, para gerir as complexas operações de múltiplos projetos e equipas. Embora ferramentas como o Microsoft Excel ofereçam grande versatilidade inicial, a sua aplicação na gestão detalhada demonstra limitações significativas à medida que a escala e a complexidade aumentam. Os desafios comuns incluem:

*   **Falta de Validação e Consistência:** A ausência de validação de dados robusta e em tempo real, juntamente com a dificuldade em manter a consistência da informação entre diversos ficheiros ou versões, eleva a propensão a erros manuais e compromete a fiabilidade dos dados.
*   **Dificuldades na Gestão de Recursos:** A alocação de pessoal a múltiplos projetos ou fases torna-se particularmente árdua, resultando frequentemente em desequilíbrios na carga de trabalho (sobrealocação ou subutilização), dificuldades na identificação atempada de conflitos de recursos e potenciais problemas de conformidade, especialmente sem mecanismos de controlo automatizados.
*   **Visibilidade Limitada:** A consolidação de dados para obter uma visão global e atualizada do portfólio de projetos ou da capacidade real da equipa exige frequentemente processos manuais morosos. A extração de métricas chave (progresso, prazos, custos, utilização) requer esforço considerável, limitando a agilidade na tomada de decisão e a capacidade de resposta a desvios ou novas prioridades.

<!-- SUGESTÃO: Tabela - Comparar limitações de ferramentas genéricas (Excel) vs. benefícios esperados de plataformas dedicadas em áreas como validação, gestão de recursos, visibilidade e colaboração. -->

Estes desafios tendem a escalar exponencialmente com o volume e a interdependência dos projetos, evidenciando a necessidade de plataformas especializadas. A falta de mecanismos robustos para colaboração em tempo real, a geração de relatórios consolidados dinâmicos e a gestão granular de permissões são outras barreiras frequentemente encontradas em ferramentas genéricas quando aplicadas a cenários complexos de gestão de projetos e recursos.

### 2.3 Plataformas de Gestão de Projetos no Mercado

Face às limitações das abordagens manuais e genéricas, o mercado desenvolveu uma vasta gama de soluções digitais dedicadas à gestão de projetos. Estas plataformas SaaS (Software as a Service) visam centralizar a informação, automatizar processos e fornecer maior visibilidade e controlo sobre as operações. Exemplos notórios incluem:

*   **Ferramentas focadas em Gantt e Planeamento:** Soluções como `Instagantt` [1] especializam-se na visualização temporal de projetos através de gráficos de Gantt, facilitando a gestão de tarefas, dependências, marcos e caminhos críticos. Oferecem frequentemente funcionalidades de gestão de carga de trabalho (`workload management`) para otimizar a alocação de recursos.
*   **Plataformas Abrangentes (All-in-One):** Ferramentas como `Wrike` [2], `Scoro` [2], `Zoho Projects` [3], `Teamwork.com` [3] e `Infinity` (mencionado como Star Infinity em algumas comparações [1]) procuram oferecer um conjunto mais vasto de funcionalidades integradas. Estas podem incluir múltiplas visualizações (Kanban, tabelas, listas, calendários), gestão financeira do projeto, CRM, faturação, colaboração em equipa, relatórios avançados e, em alguns casos, portais para interação com clientes [3].
*   **Soluções com Nichos Específicos:** Existem ainda ferramentas mais direcionadas a indústrias ou metodologias particulares, como software para desenvolvimento ágil (e.g., Jira) ou gestão de projetos de construção [1].

<!-- SUGESTÃO: Tabela - Resumo comparativo das plataformas mencionadas (Instagantt, Wrike, Scoro, Zoho Projects, Teamwork, Infinity), destacando o foco principal (Gantt vs. All-in-One) e talvez 2-3 funcionalidades chave de cada uma. -->

As características comuns a muitas destas plataformas incluem [1, 2]:

*   **Gestão de Tarefas:** Criação, atribuição, definição de prazos e prioridades.
*   **Visualização do Projeto:** Gráficos de Gantt, quadros Kanban, listas, calendários.
*   **Gestão de Recursos:** Alocação de membros da equipa a tarefas, visualização da carga de trabalho.
*   **Colaboração:** Comentários, partilha de ficheiros, notificações.
*   **Relatórios e Análises:** Dashboards, exportação de dados, acompanhamento do progresso e custos.
*   **Personalização e Integrações:** Campos personalizados, fluxos de trabalho adaptáveis e capacidade de integração com outras ferramentas (e.g., calendários, armazenamento na cloud, ferramentas de desenvolvimento).

A escolha da ferramenta adequada depende intrinsecamente das necessidades específicas da organização, da complexidade dos projetos, do tamanho da equipa, do orçamento e da cultura de trabalho [2]. A tendência crescente para abordagens híbridas na gestão de projetos, que combinam elementos de diferentes metodologias (e.g., Waterfall e Agile), também exige flexibilidade por parte das ferramentas utilizadas [4].

### 2.4 Análise Comparativa e Posicionamento do STARSoftFlow

Embora as plataformas de mercado ofereçam um leque alargado de funcionalidades standard, a sua aplicabilidade pode encontrar barreiras em contextos muito específicos, como o da gestão de projetos de I&D com equipas multidisciplinares e requisitos de alocação de recursos altamente especializados. É neste cenário que se posiciona o `STARSoftFlow`.

A análise comparativa entre soluções standard e o desenvolvimento de uma ferramenta à medida como o `STARSoftFlow` envolve vários eixos:

*   **Adaptação vs. Generalização:** Ferramentas standard são desenhadas para um público vasto, o que pode significar que fluxos de trabalho muito específicos da organização (e.g., processos de submissão de propostas de I&D, gestão de propriedade intelectual associada, alocação de equipamento especializado) não são nativamente suportados ou requerem configurações complexas e, por vezes, insuficientes. O `STARSoftFlow`, ao ser desenvolvido à medida, pode ser moldado exatamente aos processos e necessidades identificadas, garantindo uma aderência total ao fluxo operacional desejado.
*   **Foco nas Dores Principais:** Enquanto plataformas "all-in-one" tentam cobrir todas as facetas da gestão, o `STARSoftFlow` pode concentrar-se em resolver de forma otimizada os desafios mais críticos identificados na secção 2.2, nomeadamente a gestão precisa da alocação de recursos em múltiplos projetos de I&D, a prevenção de sobrealocações, a garantia de conformidade e a visibilidade clara da capacidade da equipa e do progresso dos projetos.
*   **Integração e Ecossistema:** A integração de ferramentas standard com sistemas legados ou bases de dados internas específicas pode ser complexa ou limitada. O `STARSoftFlow` pode ser desenhado desde o início para interagir de forma transparente com o ecossistema tecnológico existente na organização.
*   **Custos e Propriedade:** O desenvolvimento à medida implica um investimento inicial potencialmente superior ao custo de subscrição de uma ferramenta standard. Contudo, elimina custos recorrentes de licenciamento por utilizador (comuns em modelos SaaS [1]) e confere à organização total propriedade e controlo sobre a ferramenta e os seus dados, permitindo uma evolução futura totalmente alinhada com as suas necessidades estratégicas.
*   **Curva de Aprendizagem:** Uma ferramenta desenhada especificamente para os processos da organização pode, potencialmente, ter uma curva de aprendizagem mais suave para os utilizadores internos, pois reflete a sua realidade operacional, ao contrário de uma ferramenta genérica que pode introduzir novos paradigmas de trabalho.

<!-- SUGESTÃO: Tabela - Comparar diretamente Soluções Standard vs. STARSoftFlow nos eixos mencionados (Adaptação, Foco, Integração, Custos, Curva Aprendizagem), resumindo os pontos fortes/fracos de cada abordagem no contexto do projeto. -->

Em suma, o `STARSoftFlow` não visa replicar a totalidade das funcionalidades de uma plataforma de mercado genérica. O seu valor reside na capacidade de oferecer uma solução profundamente adaptada e otimizada para os desafios específicos da gestão de projetos e recursos no ambiente de I&D da organização, superando as limitações identificadas tanto nas abordagens manuais/genéricas como nas potenciais inadequações das soluções standard disponíveis.

### Referências

[1] Instagantt. *Instagantt vs. Star Infinity: Getting You Ready to Go*. Disponível em: https://www.instagantt.com/alternatives/instagantt-vs-star-infinity
[2] Forbes Advisor. *Best Project Management Software Of 2024*. Disponível em: https://www.forbes.com/advisor/business/software/best-project-management-software/
[3] The Digital Project Manager. *30 Best Project Management Software With Client Portals (2024)*. Disponível em: https://thedigitalprojectmanager.com/tools/best-project-management-software-client-portal/
[4] Forbes Advisor. *Best Project Management Software Of 2024* (Secção sobre Hybrid Approaches). Disponível em: https://www.forbes.com/advisor/business/software/best-project-management-software/

---

## 3. Metodologias, Tecnologias e Ferramentas Utilizadas

Este capítulo detalha as metodologias de desenvolvimento, as linguagens de programação, as frameworks, as bibliotecas e as ferramentas que foram selecionadas e utilizadas na concepção e implementação da plataforma STARSoftFlow. A escolha destas tecnologias foi orientada por uma filosofia centrada na **segurança de tipos (type safety) de ponta a ponta**, na **performance otimizada** através de renderização no servidor sempre que possível, e numa **experiência de desenvolvimento (DX) de elevada produtividade**, tirando partido do ecossistema TypeScript moderno. O objetivo foi criar uma stack tecnológica moderna, robusta, escalável e que permitisse a entrega eficiente das funcionalidades requeridas.

### 3.1. Linguagem de Programação: TypeScript

A base de todo o desenvolvimento do STARSoftFlow foi realizada utilizando **TypeScript**. TypeScript é um superconjunto de JavaScript, desenvolvido pela Microsoft, que adiciona tipagem estática opcional à linguagem. A adoção de TypeScript foi fundamental pelas seguintes razões:

- **Segurança de Tipos (Type Safety):** A principal vantagem é a capacidade de detetar erros em tempo de compilação, em vez de em tempo de execução. Isto reduz significativamente a ocorrência de bugs relacionados com tipos de dados incorretos, especialmente em aplicações complexas com múltiplos fluxos de dados [@Web: TypeScript Handbook].
- **Melhor Experiência de Desenvolvimento (DX):** A tipagem estática melhora o *IntelliSense* (autocompletar, sugestões de código) nos editores de código modernos (como o Visual Studio Code), facilita a refatoração e torna o código mais auto-documentado e fácil de entender por outros programadores ou pelo próprio no futuro.
- **Escalabilidade e Manutenção:** Em projetos de maior dimensão, a estrutura e a clareza impostas pelo TypeScript facilitam a manutenção e a evolução da base de código ao longo do tempo [@Web: What is TypeScript and why should you use it?].
- **Ecossistema Moderno:** TypeScript tem vindo a ganhar uma adoção massiva na comunidade de desenvolvimento web, sendo suportado pela maioria das frameworks e bibliotecas modernas, incluindo as utilizadas neste projeto [@Web: State of JS 2023 Survey].

<!-- SUGESTÃO: Diagrama/Imagem - Ilustrar a diferença entre erro detetado em tempo de compilação (TypeScript) vs. erro em tempo de execução (JavaScript). -->

### 3.2. Framework Web Full-Stack: Next.js

Para a construção da interface do utilizador (frontend) e da lógica do lado do servidor (backend), foi escolhida a framework **Next.js** (versão 14 ou superior). Desenvolvida pela Vercel, Next.js é uma framework React que oferece uma estrutura opinativa mas flexível para a criação de aplicações web modernas e performantes [@Web: Next.js by Vercel]. As suas características chave que motivaram a sua escolha incluem:

- **Renderização Híbrida e Otimizada:** Suporta diferentes estratégias de renderização (SSR, SSG, ISR, CSR), com forte ênfase nos **React Server Components (RSC)**. Os RSC permitem executar componentes React no servidor, reduzindo drasticamente a quantidade de JavaScript enviada para o cliente, melhorando o tempo de carregamento inicial (LCP) e permitindo o acesso direto e seguro a fontes de dados do backend (como o Prisma Client) sem expor APIs adicionais [@Web: Next.js Rendering Documentation].
- **Routing Baseado em Ficheiros (App Router):** O sistema de roteamento do Next.js (especificamente o App Router) simplifica a criação de rotas, layouts e gestão de estados de carregamento/erro de forma intuitiva, baseando-se na estrutura de pastas do projeto.
- **Otimizações Integradas:** Inclui otimizações automáticas para imagens (`next/image`), fontes, scripts e *code splitting* por rota, contribuindo para melhores métricas de desempenho (Web Vitals).
- **Ecossistema e Comunidade:** Possui uma vasta comunidade, excelente documentação e integra-se facilmente com outras tecnologias e serviços, incluindo as restantes ferramentas desta stack.

<!-- SUGESTÃO: Diagrama - Representar visualmente as diferentes estratégias de renderização do Next.js (SSR, SSG, ISR, RSC) e onde o STARSoftFlow as utiliza preferencialmente. -->

### 3.3. Camada de API Type-Safe: tRPC e Gestão de Estado do Servidor

Para a comunicação entre o frontend e o backend, optou-se por utilizar **tRPC** (TypeScript Remote Procedure Call) em vez de uma API REST ou GraphQL tradicional.

- **tRPC:** Permite criar APIs totalmente type-safe de ponta a ponta, sem a necessidade de gerar esquemas ou tipos manualmente [@Web: tRPC Documentation].
    - **Segurança de Tipos End-to-End:** Os tipos definidos no backend (nas funções do router tRPC, muitas vezes inferidos diretamente do Zod e Prisma) são automaticamente disponibilizados no frontend através de um cliente tRPC tipado. Qualquer desalinhamento entre a chamada no frontend e a definição no backend resulta num erro de compilação, eliminando virtualmente erros de integração API.
    - **DX Superior:** Proporciona autocompletar para os procedimentos da API e inferência automática dos tipos de dados de entrada e saída nos hooks do cliente.
    - **Simplicidade:** Elimina a necessidade de definir esquemas (GraphQL) ou gerir manualmente documentação/tipos (REST), focando o desenvolvimento na lógica de negócio.
- **Gestão de Estado do Servidor (TanStack Query):** Para gerir o ciclo de vida dos dados obtidos da API (fetching, caching, sincronização, atualização), utilizou-se a biblioteca **TanStack Query (v5)** (anteriormente React Query). A integração `@trpc/react-query` fornece hooks (`api.procedure.useQuery`, `api.procedure.useMutation`) que combinam a type safety do tRPC com as poderosas funcionalidades de gestão de estado assíncrono do TanStack Query, como caching automático, refetching em background, e tratamento otimista de mutações [@Web: TanStack Query Documentation, @Web: tRPC React Query Integration].

<!-- SUGESTÃO: Diagrama - Mostrar o fluxo da type safety end-to-end com tRPC: Definição da procedure no backend -> Inferência de tipos -> Cliente tRPC tipado no frontend -> Utilização segura nos hooks do TanStack Query. -->

### 3.4. Validação de Dados: Zod

Para garantir a integridade dos dados em toda a aplicação, desde formulários no frontend até às procedures da API no backend e interações com a base de dados, utilizou-se a biblioteca **Zod**.

- **Esquemas Declarativos:** Zod permite definir esquemas de validação para tipos de dados TypeScript de forma declarativa e concisa [@Web: Zod GitHub Repository].
- **Inferência de Tipos:** Permite inferir tipos TypeScript estáticos diretamente a partir dos esquemas de validação (`z.infer<typeof schema>`), garantindo que os tipos e as validações estão sempre sincronizados.
- **Integração:** Integra-se perfeitamente com formulários (e.g., com React Hook Form), com tRPC (para validar inputs de procedures) e pode ser usado para validar dados antes de os enviar para o Prisma Client.

<!-- SUGESTÃO: Diagrama/Snippet - Exemplo visual de como um esquema Zod define uma estrutura de dados e como o tipo TypeScript é inferido a partir dele. -->

### 3.5. Base de Dados: PostgreSQL

Como sistema de gestão de base de dados relacional (RDBMS), foi escolhido o **PostgreSQL**. É um sistema open-source robusto, fiável e altamente extensível [@Web: PostgreSQL Documentation].

- **Fiabilidade e Robustez:** Reconhecido pela sua estabilidade, conformidade ACID e capacidade de lidar com cargas de trabalho complexas.
- **Funcionalidades Avançadas:** Suporta tipos de dados JSONB, indexação avançada (GIN, GiST), full-text search, e extensões.
- **Comunidade e Ecossistema:** Vasta comunidade ativa e suporte alargado em plataformas cloud e ferramentas de desenvolvimento.
- **Popularidade e Suporte:** Consistentemente classificado como um dos RDBMS mais populares e avançados [@Web: DB-Engines Ranking].

<!-- SUGESTÃO: Pode-se considerar um Diagrama Entidade-Relação (ER) simplificado das principais entidades da base de dados aqui ou numa secção posterior sobre a modelação de dados. -->

### 3.6. ORM (Object-Relational Mapper): Prisma

Para interagir com a base de dados PostgreSQL foi utilizado o **Prisma**. Prisma é um ORM moderno para Node.js e TypeScript [@Web: Prisma ORM Documentation].

- **Schema Declarativo (`schema.prisma`):** Única fonte de verdade para a estrutura da base de dados e modelos da aplicação.
- **Migrações Seguras (`Prisma Migrate`):** Geração automática e gestão de scripts SQL para migrações de base de dados, garantindo consistência entre o schema e a BD.
- **Cliente Type-Safe (`Prisma Client`):** Cliente de base de dados totalmente type-safe gerado a partir do schema, com autocompletar e segurança nas queries.
- **Experiência de Desenvolvimento:** Ferramentas como `Prisma Studio` (GUI para dados) e a clareza do cliente simplificam a interação com a base de dados.

<!-- SUGESTÃO: Imagem - Screenshot do Prisma Studio a visualizar uma das tabelas da base de dados, ou um diagrama simples do fluxo: Schema Prisma -> Prisma Migrate -> Prisma Client. -->

### 3.7. Autenticação: Auth.js (NextAuth.js)

A gestão de utilizadores e a autenticação foram implementadas utilizando **Auth.js** (v5) [@Web: Auth.js Documentation].

- **Flexibilidade:** Suporta múltiplos provedores (Credentials, OAuth) e estratégias de sessão (JWT, Database).
- **Segurança:** Abstrai complexidades (gestão de sessões, CSRF, callbacks).
- **Integração com Next.js:** Desenhado para o ecossistema Next.js (App Router, Server Actions, RSC).

<!-- SUGESTÃO: Diagrama - Fluxo de autenticação simplificado (ex: login com credenciais ou OAuth) usando Auth.js no contexto Next.js. -->

### 3.8. Ferramentas de Desenvolvimento, UI e Qualidade

Um conjunto de ferramentas adicionais foi utilizado para garantir a qualidade, consistência e produtividade do desenvolvimento:

- **Gestor de Pacotes e Runtime (Bun):** Optou-se por utilizar o **Bun** como runtime JavaScript e gestor de pacotes, devido à sua performance significativamente superior em instalação de dependências, execução de scripts e tempo de arranque, comparativamente ao Node.js/npm/yarn [@Web: Bun Website Placeholder].
- **Containerização (Docker):** O **Docker** foi essencial para criar um ambiente de desenvolvimento consistente, containerizando a base de dados PostgreSQL. Isto simplifica a configuração inicial e garante que todos os membros da equipa (ou o ambiente de CI/CD) utilizam a mesma versão do serviço [@Web: How to Use the Postgres Docker Official Image].
- **Componentes de UI (Shadcn UI / Radix UI):** Utilizou-se **Shadcn UI**, uma coleção de componentes React reutilizáveis e personalizáveis, construídos sobre as primitivas acessíveis do **Radix UI** e estilizados com **Tailwind CSS**. Esta abordagem permite controlo total sobre o código dos componentes, facilitando a adaptação e a manutenção de um design system coeso [@Web: Shadcn UI Website Placeholder, Radix UI Website Placeholder].
- **Estilização (Tailwind CSS):** A abordagem *utility-first* do **Tailwind CSS** foi usada para toda a estilização, permitindo desenvolvimento rápido de interfaces, manutenção fácil e garantia de consistência visual sem sair do HTML/JSX [@Web: Tailwind CSS Website Placeholder].
- **Qualidade de Código (ESLint / Prettier):** Para garantir a consistência e a qualidade do código, foram configurados o **ESLint** (com plugins para React, TypeScript, Next.js) para análise estática e aplicação de regras de codificação, e o **Prettier** para formatação automática do código, mantendo um estilo uniforme em toda a base de código.
- **Controlo de Versões (Git / GitHub):** O **Git** foi utilizado para controlo de versões local, e o **GitHub** para alojamento do repositório remoto, gestão de branches, code reviews (Pull Requests) e colaboração [@Web: GitHub Website Placeholder].
- **Editor de Código (Visual Studio Code):** O desenvolvimento foi realizado no **VS Code**, aproveitando as suas extensões para TypeScript, Prisma, Tailwind CSS IntelliSense, ESLint, Prettier, Docker, que otimizam significativamente a experiência de desenvolvimento com esta stack tecnológica [@Web: VS Code Website Placeholder].

*(Opcional: Considerar adicionar aqui a Figura 3.1: Diagrama de Arquitetura de Alto Nível do STARSoftFlow, mostrando a interação entre Frontend (Next.js/React), Backend (Next.js/tRPC Server), Prisma Client e Base de Dados PostgreSQL.)*

<!-- SUGESTÃO: Imagem/Logos - Uma composição visual com os logos das principais tecnologias utilizadas (TypeScript, Next.js, tRPC, Prisma, PostgreSQL, Tailwind, Shadcn, Docker, Bun, etc.). -->

---

