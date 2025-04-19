import { Card, CardContent } from '@/components/ui/card';
import { useCustosMensais } from '@/hooks/useCustosMensais';
import { ResponsiveBar } from '@nivo/bar';

interface CostChartProps {
  projetoId: string;
  ano: string;
}

// componente que mostra o grafico de custos mensais
export function CostChart({ projetoId, ano }: CostChartProps) {
  const { data: custos } = useCustosMensais(projetoId, ano);

  if (!custos?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Sem dados para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-64">
          <ResponsiveBar
            data={custos}
            keys={['estimado', 'realizado']}
            indexBy="mes"
            margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={['#94a3b8', '#475569']} // cores do tailwind slate-400 e slate-600
            borderRadius={4}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              format: (value) => `${value}€`,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            role="application"
            ariaLabel="Gráfico de custos mensais"
          />
        </div>
      </CardContent>
    </Card>
  );
} 