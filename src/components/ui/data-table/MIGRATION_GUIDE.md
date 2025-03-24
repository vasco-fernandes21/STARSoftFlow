# Guia de Migração: TabelaDados → DataTable

Este guia ajudará você a migrar do componente `TabelaDados` existente para o novo componente `DataTable` baseado no TanStack Table e shadcn/ui.

## 1. Instalação de Dependências

Primeiro, instale as dependências necessárias:

```bash
bun add @tanstack/react-table
```

## 2. Estrutura do Componente

### TabelaDados (Antigo)
```tsx
<TabelaDados
  title="Projetos"
  subtitle="Gerencie seus projetos"
  actionButton={<Button>Novo Projeto</Button>}
  data={dados}
  isLoading={loading}
  columns={colunas}
  searchConfig={{
    placeholder: "Pesquisar projetos...",
    value: termoPesquisa,
    onChange: setTermoPesquisa,
  }}
  filterConfigs={[
    {
      id: "status",
      label: "Status",
      options: opcoesStatus,
      value: filtroStatus,
      onChange: setFiltroStatus,
    }
  ]}
  sortConfig={{
    field: ordenacao,
    direction: direcaoOrdenacao,
    onChange: handleOrdenacao,
  }}
  itemsPerPage={10}
  currentPage={paginaAtual}
  setCurrentPage={setPaginaAtual}
  totalItems={totalItens}
  totalPages={totalPaginas}
  onRowClick={handleRowClick}
  clearAllFilters={limparFiltros}
/>
```

### DataTable (Novo)
```tsx
<DataTable
  columns={colunasDefinidas}
  data={dados}
  title="Projetos"
  subtitle="Gerencie seus projetos"
  actionButton={<Button>Novo Projeto</Button>}
  isLoading={loading}
  searchPlaceholder="Pesquisar projetos..."
  filterConfigs={[
    {
      id: "status",
      label: "Status",
      options: opcoesStatus,
      value: filtroStatus,
      onChange: setFiltroStatus,
    }
  ]}
  initialSorting={[{ id: "nome", desc: false }]}
  initialPageSize={10}
  serverSidePagination={{
    totalItems: totalItens,
    pageCount: totalPaginas,
    pageIndex: paginaAtual,
    pageSize: 10,
    onPageChange: setPaginaAtual,
  }}
  onRowClick={handleRowClick}
  onClearFilters={limparFiltros}
/>
```

## 3. Definição de Colunas

### TabelaDados (Antigo)
```tsx
const colunas = [
  {
    id: "nome",
    label: "Nome",
    sortable: true,
    renderCell: (item) => item.nome,
  },
  {
    id: "status",
    label: "Status",
    renderCell: (item) => getStatusBadge(item.status),
  },
  // ...outras colunas
];
```

### DataTable (Novo)
```tsx
import { ColumnDef } from "@tanstack/react-table";

export const colunas: ColumnDef<Projeto>[] = [
  {
    accessorKey: "nome",
    header: ({ column }) => (
      <div className="flex items-center">
        <span>Nome</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="ml-1 h-6 w-6 rounded-full"
        >
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("nome")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => getStatusBadge(row.getValue("status")),
  },
  // ...outras colunas
];
```

## 4. Principais Diferenças

### Definição de Colunas
- **Antiga**: Propriedades como `id`, `label`, `renderCell`
- **Nova**: Propriedades como `accessorKey`, `header`, `cell`

### Ordenação
- **Antiga**: Configuração externa via `sortConfig`
- **Nova**: Integrada na definição de colunas com `toggleSorting`

### Filtros
- **Antiga**: Configuração externa via `filterConfigs`
- **Nova**: Mantém interface similar para compatibilidade, mas usa internamente o sistema de filtros do TanStack

### Paginação
- **Antiga**: Propriedades `itemsPerPage`, `currentPage`, `setCurrentPage`
- **Nova**: `initialPageSize` e objeto `serverSidePagination` para paginação do servidor

### Pesquisa
- **Antiga**: Objeto `searchConfig` com `value` e `onChange`
- **Nova**: Gerenciado internamente com a propriedade `searchPlaceholder`

## 5. Migração Passo a Passo

1. **Preparação**:
   - Crie arquivos separados para as colunas (`columns.tsx`)
   - Importe o componente `DataTable` em vez de `TabelaDados`

2. **Mapeamento de Colunas**:
   - Converta cada coluna para o formato do TanStack Table
   - Use `accessorKey` em vez de `id`
   - Mova a lógica de renderização para a propriedade `cell`

3. **Pesquisa e Filtros**:
   - Use `setGlobalFilter` do TanStack Table para pesquisa global
   - Mantenha `filterConfigs` para compatibilidade

4. **Paginação**:
   - Para paginação do cliente, use `initialPageSize`
   - Para paginação do servidor, use o objeto `serverSidePagination`

5. **Ordenação**:
   - Implemente a ordenação nas definições de coluna
   - Use o estado `sorting` do TanStack Table

## 6. Exemplo Completo

Veja o arquivo `usage-example.tsx` para um exemplo completo de como usar o componente `DataTable`.

## 7. Benefícios da Migração

- **Performance Aprimorada**: O TanStack Table oferece melhor performance para tabelas grandes
- **Tipos TypeScript Melhorados**: Definições de tipo mais robustas
- **Mais Recursos**: Acesso a recursos avançados como seleção de linhas, expansão, agrupamento, etc.
- **Manutenibilidade**: Componentes menores e mais focados
- **Extensibilidade**: Facilidade para adicionar novos recursos

## 8. Considerações Finais

A migração pode ser feita gradualmente, componente por componente. Não é necessário migrar tudo de uma vez.

Para mais detalhes sobre o TanStack Table, consulte a [documentação oficial](https://tanstack.com/table/v8/docs/guide/introduction). 