import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ProjetoEstado } from "@prisma/client";
import { imageToBase64 } from "@/app/actions/images";

// Interface para os dados recebidos da API
interface RelatorioMensalOutput {
    utilizador: {
      id: string;
      nome: string;
      email?: string;
      cargo?: string;
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
      projetoEstado?: ProjetoEstado;
      ocupacao: number;
    }>;
    estatisticas?: any;
    atividades?: any[];
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

// Template otimizado para impressão em A4 com Puppeteer
export async function RelatorioTemplate({ data, periodo }: RelatorioTemplateProps) {
  // Carregar imagens em base64
  const [starLogo, barraLogos, mianiLogo] = await Promise.all([
    imageToBase64('star-logo-branco.png'),
    imageToBase64('logos/BARRA_LOGOS-03.png'),
    imageToBase64('logos/miani.svg')
  ]);

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
            @page {
                size: A4;
                margin: 0;
            }
            
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            body {
                margin: 0;
                padding: 0;
                background-color: white;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                color: #1a202c;
            }
            
            .page {
                width: 100%;
                max-width: 210mm;
                min-height: 297mm;
                padding: 0;
                margin: 0 auto;
                overflow: hidden;
                position: relative;
                background-color: white;
                page-break-after: always;
            }
            
            @media print {
                body {
                    width: 210mm;
                    height: 297mm;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0;
                }
            }
            
            .header {
                width: 100%;
                background: linear-gradient(90deg, #003366 0%, #004080 100%);
                color: white;
                padding: 1.5rem;
                position: relative;
            }
            
            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                max-width: 100%;
            }
            
            .logo {
                height: 2.5rem;
                width: auto;
            }
            
            @media print {
                .logo {
                    width: 50mm;
                    height: auto;
                }
                .header {
                    height: 60mm;
                    padding: 15mm;
                }
            }
            
            .header-text {
                text-align: right;
            }
            
            .title {
                font-size: 20pt;
                font-weight: 600;
                margin-bottom: 3mm;
            }
            
            .subtitle {
                font-size: 14pt;
                margin-bottom: 2mm;
            }
            
            .period {
                font-size: 12pt;
                padding: 1.5mm 3mm;
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 1.5mm;
                display: inline-block;
            }
            
            .content {
                padding: 10mm 5mm;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 5mm;
                margin-bottom: 10mm;
            }
            
            .info-card {
                background-color: #f8fafc;
                border: 0.5mm solid #e2e8f0;
                border-radius: 2mm;
                padding: 5mm;
            }
            
            .info-label {
                font-size: 9pt;
                color: #4a5568;
                text-transform: uppercase;
                letter-spacing: 0.5pt;
                margin-bottom: 2mm;
            }
            
            .info-value {
                font-size: 16pt;
                font-weight: 600;
                color: #003366;
            }
            
            .section-title {
                font-size: 14pt;
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 5mm;
                padding-bottom: 2mm;
                border-bottom: 0.5mm solid #003366;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10mm;
            }
            
            th {
                background-color: #003366;
                color: white;
                font-weight: 600;
                text-align: left;
                padding: 3mm;
                font-size: 10pt;
                text-transform: uppercase;
                letter-spacing: 0.5pt;
            }
            
            td {
                padding: 3mm;
                border-bottom: 0.25mm solid #e2e8f0;
                font-size: 10pt;
            }
            
            .projeto-row {
                background-color: #f8fafc;
            }
            
            .projeto-row td:first-child {
                font-weight: 600;
                border-left: 1mm solid #003366;
            }
            
            .workpackage-row td:first-child {
                padding-left: 8mm;
                color: #4a5568;
            }
            
            .total-row {
                background-color: #003366;
                color: white;
                font-weight: 600;
            }
            
            .progress-container {
                margin-top: 2mm;
            }
            
            .progress-bar {
                width: 100%;
                height: 2mm;
                background-color: rgba(0, 51, 102, 0.1);
                border-radius: 1mm;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background-color: #00796b;
                border-radius: 1mm;
                transition: width 0.3s ease;
            }
            
            .signature-section {
                margin-top: 20mm;
                text-align: center;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0 20mm;
            }
            
            .signature-line {
                width: 60mm;
                margin: 5mm auto 0;
                border-top: 0.25mm solid #4a5568;
            }
            
            .signature-label {
                color: #4a5568;
                font-size: 9pt;
                margin-bottom: 6rem;
                padding-bottom: 0;
                text-align: center;
                width: 100%;
            }
            
            .footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 10mm 20mm;
            }
            
            .logos-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 5mm;
                padding: 5mm;
                background-color: white;
            }
            
            .logos-container img {
                height: 15mm;
                width: auto;
                object-fit: contain;
            }
            
            .footer-text {
                text-align: center;
                color: #4a5568;
                font-size: 8pt;
                padding-top: 5mm;
                border-top: 0.25mm solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <header class="header">
                <div class="header-content" style="display: flex; align-items: center;">
                    <img src="${starLogo}" alt="STAR Institute" class="logo" />
                    <div class="header-text">
                        <h1 class="title">Relatório de Horas</h1>
                        <p class="subtitle">${data.utilizador.nome}</p>
                        <div class="period">${nomeMesCapitalizado} ${periodo.ano}</div>
                    </div>
                </div>
            </header>
            
            <main class="content">
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
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 45%">Projeto / Workpackage</th>
                            <th style="width: 30%">Ocupação (%)</th>
                            <th style="width: 25%; text-align: right">Horas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(projetosAgrupados).map((projeto) => `
                            <tr class="projeto-row">
                                <td>${projeto.nome}</td>
                                <td>
                                    ${formatNumber(projeto.totalOcupacao)}%
                                    <div class="progress-container">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${projeto.totalOcupacao}%"></div>
                                        </div>
                                    </div>
                                </td>
                                <td style="text-align: right">${formatNumber(projeto.totalHoras)}h</td>
                            </tr>
                            ${projeto.workpackages.map(wp => `
                                <tr class="workpackage-row">
                                    <td>${wp.nome}</td>
                                    <td>
                                        ${formatNumber(wp.ocupacao)}%
                                        <div class="progress-container">
                                            <div class="progress-bar">
                                                <div class="progress-fill" style="width: ${wp.ocupacao}%"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="text-align: right">${formatNumber(wp.horas)}h</td>
                                </tr>
                            `).join('')}
                        `).join('')}
                        
                        <tr class="total-row">
                            <td>TOTAL GLOBAL</td>
                            <td>
                                ${formatNumber(totalGlobalOcupacao)}%
                                <div class="progress-container">
                                    <div class="progress-bar" style="background-color: rgba(255, 255, 255, 0.2)">
                                        <div class="progress-fill" style="background-color: white; width: ${totalGlobalOcupacao}%"></div>
                                    </div>
                                </div>
                            </td>
                            <td style="text-align: right">${formatNumber(totalGlobalHoras)}h</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="signature-section">
                    <div class="signature-label" style="margin-bottom: 6rem margin-left: 1rem">Rubrica do(a) Técnico(a)</div>
                    <div class="signature-line"></div>
                </div>
            </main>
            
            <footer class="footer">
                <div class="logos-container">
                    <img src="${barraLogos}" alt="Logos Institucionais" />
                    <img src="${mianiLogo}" alt="" />
                </div>
                <p class="footer-text">
                    Documento gerado automaticamente a ${format(new Date(), "dd/MM/yyyy")}
                </p>
            </footer>
        </div>
    </body>
    </html>
  `;
} 