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
            
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                background-color: white;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                color: #1a202c;
            }
            
            .page {
                width: 210mm;
                min-height: 297mm;
                padding: 0;
                margin: 0;
                overflow: hidden;
                position: relative;
                background-color: white;
                page-break-after: always;
            }
            
            @media print {
                html, body {
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                }
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0;
                    padding: 0;
                    border: none;
                }
            }
            
            .header {
                width: 100%;
                background: linear-gradient(90deg, #003366 0%, #004080 100%);
                color: white;
                padding: 6mm 8mm;
                display: flex;
                align-items: center;
                height: 32mm;
                border-bottom: 0.5mm solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                position: relative;
            }
            
            .header::after {
                content: '';
                position: absolute;
                top: 0;
                right: -2mm; /* Estende um pouco mais à direita */
                width: 2mm;
                height: 100%;
                background: linear-gradient(90deg, #003366 0%, #004080 100%);
            }
            
            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            }
            
            .logo {
                height: 13mm;
                width: auto;
            }
            
            .header-text {
                text-align: right;
                padding-left: 4mm;
            }
            
            .title {
                font-size: 16pt;
                font-weight: 600;
                margin-bottom: 2mm;
                letter-spacing: 0.025em;
            }
            
            .subtitle {
                font-size: 12pt;
                margin-bottom: 2mm;
                opacity: 0.9;
            }
            
            .period {
                font-size: 10pt;
                padding: 1mm 3mm;
                background-color: rgba(255, 255, 255, 0.15);
                border-radius: 2mm;
                display: inline-block;
            }
            
            .content {
                padding: 10mm 10mm;
                position: relative;
                z-index: 10;
                min-height: calc(297mm - 32mm - 85mm); /* A4 height - header - (footer + signature) space */
                display: flex;
                flex-direction: column;
                background-color: white;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4mm;
                margin-bottom: 6mm;
            }
            
            .info-card {
                background-color: #ffffff;
                border: 0.25mm solid #e2e8f0;
                border-radius: 3mm;
                padding: 3mm;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            .info-label {
                font-size: 8pt;
                color: #4a5568;
                text-transform: uppercase;
                letter-spacing: 0.5pt;
                margin-bottom: 1mm;
                font-weight: 500;
            }
            
            .info-value {
                font-size: 12pt;
                font-weight: 600;
                color: #003366;
            }
            
            .section-title {
                font-size: 14pt;
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 8mm;
                padding-bottom: 2mm;
                border-bottom: 0.5mm solid #003366;
                position: relative;
            }
            
            .section-title::after {
                content: '';
                position: absolute;
                bottom: -0.5mm;
                left: 0;
                width: 30mm;
                height: 1mm;
                background-color: #00796b;
                border-radius: 1mm;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0; /* Removido margin-bottom da tabela */
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
            
            th {
                background-color: #003366;
                color: white;
                font-weight: 600;
                text-align: left;
                padding: 2mm 3mm;
                font-size: 9pt;
                text-transform: uppercase;
                letter-spacing: 0.5pt;
                border-bottom: 0.25mm solid #002244;
            }
            
            td {
                padding: 2mm 3mm;
                border-bottom: 0.25mm solid #e2e8f0;
                font-size: 9pt;
                vertical-align: middle;
            }
            
            .projeto-row {
                background-color: #f8fafc;
            }
            
            .projeto-row td:first-child {
                font-weight: 600;
                border-left: 0.5mm solid #003366;
            }
            
            .workpackage-row td:first-child {
                padding-left: 6mm;
                color: #4a5568;
            }
            
            .total-row {
                background-color: #003366;
                color: white;
                font-weight: 600;
            }
            
            .signature-section {
                position: fixed;
                bottom: 50mm; /* Posicionado acima do footer que tem 45mm */
                left: 0;
                right: 0;
                text-align: center;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 90;
                background-color: white;
                padding: 5mm 0;
            }
            
            .signature-container {
                display: flex;
                align-items: flex-end;
                gap: 3mm;
            }
            
            .signature-label {
                color: #4a5568;
                font-size: 9pt;
                text-align: right;
                font-weight: 500;
                margin-right: 5mm;
                line-height: 1.2;
                padding-bottom: 1mm;
            }
            
            .signature-line {
                width: 60mm;
                border-top: 0.5mm solid #4a5568;
            }
            
            .watermark {
                position: absolute;
                bottom: 10mm;
                right: 10mm;
                opacity: 0.7;
                z-index: 5;
            }
            
            .watermark img {
                width: 40mm;
                height: auto;
                opacity: 0.15;
            }
            
            .info-card:hover {
                transform: translateY(-1mm);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            tr:last-child td {
                border-bottom: none;
            }
            
            .workpackage-row:hover {
                background-color: #f1f5f9;
            }
            
            .footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 5mm 10mm;
                z-index: 5;
                height: 45mm; /* Altura fixa para o footer */
                background-color: white;
            }
            
            .logos-container {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 3mm;
                margin-bottom: 6mm;
                background-color: rgba(255, 255, 255, 0.95);
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 100;
            }
            
            .logos-container img {
                height: 12mm;
                width: auto;
                object-fit: contain;
                opacity: 0.90;
            }
            
            .footer-text {
                text-align: center;
                color: #4a5568;
                font-size: 8pt;
                padding-top: 3mm;
                border-top: 0.25mm solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <header class="header">
                <div class="header-content">
                    <img src="${starLogo}" style={{ width: '35mm', height: 'auto' }} alt="STAR Institute" class="logo" />
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
                            <th style="width: 25%">Ocupação (%)</th>
                            <th style="width: 30%; text-align: right">Horas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.values(projetosAgrupados).map((projeto) => `
                            <tr class="projeto-row">
                                <td>${projeto.nome}</td>
                                <td>${formatNumber(projeto.totalOcupacao)}%</td>
                                <td style="text-align: right">${formatNumber(projeto.totalHoras)}h</td>
                            </tr>
                            ${projeto.workpackages.map(wp => `
                                <tr class="workpackage-row">
                                    <td>${wp.nome}</td>
                                    <td>${formatNumber(wp.ocupacao)}%</td>
                                    <td style="text-align: right">${formatNumber(wp.horas)}h</td>
                                </tr>
                            `).join('')}
                        `).join('')}
                        
                        <tr class="total-row">
                            <td>TOTAL GLOBAL</td>
                            <td>${formatNumber(totalGlobalOcupacao)}%</td>
                            <td style="text-align: right">${formatNumber(totalGlobalHoras)}h</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="signature-section">
                    <div class="signature-container">
                        <div class="signature-label">Rubrica do(a) Técnico(a):</div>
                        <div class="signature-line"></div>
                    </div>
                </div>
            </main>
            
            <footer class="footer">
                <div class="logos-container">
                    <img src="${barraLogos}" alt="Logos Institucionais" />
                    <img src="${mianiLogo}" alt="Miani Logo" />
                </div>
            </footer>
        </div>
    </body>
    </html>
  `;
} 