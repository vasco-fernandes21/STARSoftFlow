import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ProjetoEstado } from "@prisma/client";

// Interface para os dados recebidos da API
interface RelatorioMensalOutput {
    utilizador: {
      id: string;
      nome: string;
    };
    configuracaoMensal: {
      diasUteis: number;
      horasPotenciais: number;
    };
    alocacoes: Array<{
      workpackageId: string;
      workpackageNome: string;
      projetoId: string;
      projetoNome: string;
      projetoEstado: ProjetoEstado;
      ocupacao: number;
    }>;
}

interface RelatorioTemplateProps {
  data: RelatorioMensalOutput;
  periodo: {
    mes: number;
    ano: number;
  };
}

// Interface para alocações agrupadas por projeto
interface ProjetoAlocacoes {
  nome: string;
  workpackages: Array<{
    id: string;
    nome: string;
    ocupacao: number;
    horas: number;
  }>;
  totalOcupacao: number;
  totalHoras: number;
}

export function RelatorioTemplate({ data, periodo }: RelatorioTemplateProps) {
  // Formatar números com 2 casas decimais
  const formatNumber = (num: number) => num.toFixed(2);

  // Agrupar alocações por projeto
  const projetosAgrupados = data.alocacoes.reduce<Record<string, ProjetoAlocacoes>>((acc, alocacao) => {
    const projeto = acc[alocacao.projetoNome] ?? {
        nome: alocacao.projetoNome,
        workpackages: [],
        totalOcupacao: 0,
        totalHoras: 0
    };

    const horas = alocacao.ocupacao * data.configuracaoMensal.horasPotenciais;
    projeto.workpackages.push({
      id: alocacao.workpackageId,
      nome: alocacao.workpackageNome,
      ocupacao: alocacao.ocupacao * 100,
      horas
    });
    projeto.totalOcupacao += alocacao.ocupacao * 100;
    projeto.totalHoras += horas;

    acc[alocacao.projetoNome] = projeto;
    return acc;
  }, {});

  // Calcular totais globais
  const totalGlobalOcupacao = Object.values(projetosAgrupados)
    .reduce((sum, p) => sum + p.totalOcupacao, 0);
  const totalGlobalHoras = Object.values(projetosAgrupados)
    .reduce((sum, p) => sum + p.totalHoras, 0);

  // Formatar o nome do mês
  const nomeMes = format(new Date(periodo.ano, periodo.mes - 1), "MMMM", { locale: ptBR });
  const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Horas - ${data.utilizador.nome}</title>
        <style>
            :root {
                --primary-color: #003366;
                --primary-light: #e6f3ff;
                --secondary-color: #4a5568;
                --accent-color: #00796b;
                --text-primary: #1a202c;
                --text-secondary: #4a5568;
                --border-color: #e2e8f0;
                --bg-light: #f8fafc;
                --bg-white: #ffffff;
                --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                --radius-sm: 0.25rem;
                --radius-md: 0.375rem;
                --radius-lg: 0.5rem;
            }
            
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.5;
                color: var(--text-primary);
                background-color: var(--bg-light);
                padding: 2rem;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background-color: var(--bg-white);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-md);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(to right, #003366, #004080);
                color: white;
                padding: 2rem;
                position: relative;
            }

            .header-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 2rem;
            }

            .logo {
                height: 60px;
                width: auto;
            }

            .header-text {
                text-align: right;
            }
            
            .title {
                font-size: 1.75rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: white;
            }
            
            .subtitle {
                font-size: 1.125rem;
                opacity: 0.9;
                margin-bottom: 0.5rem;
            }
            
            .period {
                font-size: 1.125rem;
                font-weight: 500;
                background-color: rgba(255, 255, 255, 0.1);
                padding: 0.5rem 1rem;
                border-radius: var(--radius-sm);
                display: inline-block;
            }
            
            .content {
                padding: 2rem;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2.5rem;
            }
            
            .info-card {
                background-color: var(--bg-light);
                border-radius: var(--radius-sm);
                padding: 1.5rem;
                border: 1px solid var(--border-color);
            }
            
            .info-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 0.5rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }
            
            .info-value {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--primary-color);
            }
            
            .section-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin-bottom: 1.5rem;
                color: var(--text-primary);
                padding-bottom: 0.75rem;
                border-bottom: 2px solid var(--primary-color);
            }
            
            .table-container {
                border-radius: var(--radius-sm);
                border: 1px solid var(--border-color);
                margin-bottom: 2rem;
                overflow: hidden;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
            }
            
            th {
                background-color: var(--primary-color);
                color: white;
                font-weight: 600;
                text-align: left;
                padding: 1rem;
                font-size: 0.875rem;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }
            
            td {
                padding: 1rem;
                border-bottom: 1px solid var(--border-color);
            }
            
            .projeto-header {
                background-color: var(--primary-light);
                font-weight: 600;
            }
            
            .projeto-header td:first-child {
                border-left: 4px solid var(--primary-color);
            }
            
            .workpackage-row td:first-child {
                padding-left: 2rem;
                color: var(--text-secondary);
            }
            
            .workpackage-row td:first-child::before {
                content: '›';
                position: absolute;
                left: 1rem;
                color: var(--text-secondary);
            }
            
            .percentage {
                font-weight: 600;
                color: var(--accent-color);
            }
            
            .progress-bar {
                height: 0.375rem;
                background-color: var(--border-color);
                border-radius: var(--radius-sm);
                overflow: hidden;
                margin-top: 0.375rem;
            }
            
            .progress-fill {
                height: 100%;
                background-color: var(--accent-color);
                border-radius: var(--radius-sm);
            }
            
            .total-row {
                background-color: var(--primary-color);
                color: white;
                font-weight: 600;
            }
            
            .total-row td {
                border-bottom: none;
            }
            
            .total-row .percentage {
                color: white;
            }
            
            .footer {
                text-align: center;
                padding: 2rem;
                color: var(--text-secondary);
                font-size: 0.875rem;
                border-top: 1px solid var(--border-color);
                background-color: var(--bg-light);
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .footer-text {
                color: var(--text-secondary);
                border-top: 1px solid var(--border-color);
                padding-top: 1.5rem;
                margin-top: 1.5rem;
            }

            .logos-section {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 3rem;
                background-color: var(--bg-white);
            }

            .logos-section img {
                height: 55px;
                width: auto;
                object-fit: contain;
            }

            .logos-section .eu-logos {
                height: 65px;
            }

            .signature-section {
                padding: 4rem 2rem;
                text-align: center;
            }

            .signature-label {
                font-size: 0.875rem;
                color: var(--text-secondary);
                margin-bottom: 8rem;
                font-weight: 500;
            }

            .signature-line {
                width: 300px;
                margin: 0 auto;
                border-bottom: 1px solid var(--text-secondary);
            }
            
            @media print {
                body {
                    background-color: white;
                    padding: 0;
                }
                
                .container {
                    box-shadow: none;
                    border-radius: 0;
                }
                
                .header {
                    background: var(--primary-color);
                }
            }
            
            @media (max-width: 768px) {
                body {
                    padding: 1rem;
                }
                
                .header-content {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 1rem;
                }

                .header-text {
                    text-align: center;
                }
                
                .info-grid {
                    grid-template-columns: 1fr;
                }
                
                .header {
                    padding: 1.5rem;
                }
                
                .title {
                    font-size: 1.5rem;
                }
                
                .content {
                    padding: 1.5rem;
                }

                .logo {
                    height: 40px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <img src="/logos/star-logo-branco.png" alt="STAR Institute" class="header-logo" style="height: 70px; width: auto;" />
                    <div class="header-text">
                        <h1 class="title">Relatório de Horas</h1>
                        <p class="subtitle">${data.utilizador.nome}</p>
                        <div class="period">${nomeMesCapitalizado} ${periodo.ano}</div>
                    </div>
                </div>
            </div>
            
            <div class="content">
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Jornada diária</div>
                        <div class="info-value">8,00</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Dias úteis trabalháveis</div>
                        <div class="info-value">${data.configuracaoMensal.diasUteis}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Horas trabalháveis</div>
                        <div class="info-value">${data.configuracaoMensal.horasPotenciais}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Férias e ausências</div>
                        <div class="info-value">0,00</div>
                    </div>
                </div>
                
                <h2 class="section-title">Distribuição de Horas por Projeto</h2>
                
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45%">Projeto / Workpackage</th>
                                <th style="width: 30%">Ocupação (%)</th>
                                <th style="width: 25%; text-align: right">Horas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(projetosAgrupados).map((projeto: ProjetoAlocacoes) => `
                                <tr class="projeto-header">
                                    <td>${projeto.nome}</td>
                                    <td>
                                        <div class="percentage">${formatNumber(projeto.totalOcupacao)}%</div>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${projeto.totalOcupacao}%"></div>
                                        </div>
                                    </td>
                                    <td style="text-align: right">${formatNumber(projeto.totalHoras)}h</td>
                                </tr>
                                ${projeto.workpackages.map(wp => `
                                    <tr class="workpackage-row">
                                        <td>${wp.nome}</td>
                                        <td>
                                            <div class="percentage">${formatNumber(wp.ocupacao)}%</div>
                                            <div class="progress-bar">
                                                <div class="progress-fill" style="width: ${wp.ocupacao}%"></div>
                                            </div>
                                        </td>
                                        <td style="text-align: right">${formatNumber(wp.horas)}h</td>
                                    </tr>
                                `).join('')}
                            `).join('')}
                            
                            <tr class="total-row">
                                <td>TOTAL GLOBAL</td>
                                <td>
                                    <div class="percentage">${formatNumber(totalGlobalOcupacao)}%</div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${totalGlobalOcupacao}%"></div>
                                    </div>
                                </td>
                                <td style="text-align: right">${formatNumber(totalGlobalHoras)}h</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="signature-section">
                    <div class="signature-label">Rubrica do(a) Técnico(a)</div>
                    <div class="signature-line"></div>
                </div>

                <div class="logos-section">
                    <img src="/logos/BARRA_LOGOS-03.png" alt="Logos Institucionais" class="eu-logos" />
                    <img src="/logos/miani.svg" alt="MIANI Logo" />
                </div>
            </div>
            
            <div class="footer">
                <p class="footer-text">Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-PT')}</p>
            </div>
        </div>
    </body>
    </html>
  `;
} 