import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CryptoAsset, PeriodStudyReport, AiPredictionReport } from '../types';
import { formatCurrency, formatPercentage } from './formatters';

/**
 * Generates and downloads a professional PDF report of the Cryptocurrency Market study
 */
export function exportStudyToPDF(report: PeriodStudyReport, assets: CryptoAsset[], selectedAssetAi?: AiPredictionReport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald #10B981
  const darkBg: [number, number, number] = [15, 23, 42]; // Slate 900
  const textColor: [number, number, number] = [30, 41, 59];

  // Header Banner
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, 210, 38, 'F');

  // Accent Line
  doc.setFillColor(...primaryColor);
  doc.rect(0, 38, 210, 2, 'F');

  // Title & Metadata
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CRYPTOALPHA AI - INFORME ESTRATÉGICO INSTITUCIONAL', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Período: ${report.periodLabel} | Generado: ${new Date().toLocaleString('es-ES')}`, 14, 28);
  doc.text(`Rango de Estudio: ${report.startDate} - ${report.endDate} (Mercado 24/7/365)`, 14, 33);

  let currentY = 48;

  // 1. Resumen Ejecutivo de Mercado
  doc.setTextColor(...darkBg);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Métricas Clave y Rendimiento del Mercado Cripto', 14, currentY);
  currentY += 6;

  const btcDom = report.marketSummary.btcDominancePct !== undefined ? report.marketSummary.btcDominancePct : 58.4;
  const ethDom = report.marketSummary.ethDominancePct !== undefined ? report.marketSummary.ethDominancePct : 13.8;

  const metricsData = [
    [
      'Rendimiento Global Mercado',
      formatPercentage(report.marketSummary.overallMarketReturnPct),
      'Dominancia de Bitcoin (BTC.D)',
      `${btcDom.toFixed(1)}%`,
    ],
    [
      'Dominancia de Ethereum (ETH.D)',
      `${ethDom.toFixed(1)}%`,
      'Volatilidad Media Anualizada',
      `${report.marketSummary.averageVolatility.toFixed(2)}%`,
    ],
    [
      'Sharpe Ratio Estimado',
      report.marketSummary.sharpeRatioEstimate.toFixed(2),
      'Max Drawdown Histórico',
      `${report.marketSummary.maxDrawdownEstimate.toFixed(2)}%`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    body: metricsData,
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 2. Top Criptomonedas Líderes en Rendimiento y Volumen
  doc.setTextColor(...darkBg);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Criptomonedas Líderes en Rentabilidad y Flujo On-Chain', 14, currentY);
  currentY += 6;

  const topAssetsData = report.topPerformers.map((asset, index) => [
    `#${index + 1} ${asset.name} (${asset.symbol.toUpperCase()})`,
    formatPercentage(asset.returnPct),
    formatCurrency(asset.volumeTotal),
    asset.returnPct > 15 ? 'Alta Oportunidad / Fuerte Momentum' : 'Tendencia Consolidada',
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Criptomoneda', 'Retorno en Período', 'Volumen Negociado', 'Diagnóstico Algorítmico']],
    headStyles: { fillColor: darkBg, textColor: 255, fontStyle: 'bold' },
    body: topAssetsData,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  // @ts-ignore
  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  // 3. Perspectiva Estratégica e Inteligencia Artificial
  doc.setTextColor(...darkBg);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Conclusiones y Tesis Predictiva IA (Gemini 2.5 Flash)', 14, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);

  const outlookLines = doc.splitTextToSize(report.aiStrategicOutlook, 182);
  doc.text(outlookLines, 14, currentY);
  currentY += outlookLines.length * 4.5 + 8;

  // 4. Macro Claves y Factores de Riesgo
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Puntos Críticos On-Chain y Gestión de Riesgos', 14, currentY);
  currentY += 5;

  const takeawaysData = report.macroTakeaways.map((item, idx) => [`${idx + 1}.`, item]);
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    body: takeawaysData,
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: { 0: { cellWidth: 8, fontStyle: 'bold' } },
  });

  // Save the generated document
  doc.save(`CryptoAlpha_Informe_${report.period}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exports complete cryptocurrency database and quantitative metrics to an Excel Workbook (.xlsx)
 */
export function exportStudyToExcel(report: PeriodStudyReport, assets: CryptoAsset[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen Macro Cripto
  const summaryData = [
    ['INFORME ESTRATÉGICO CRIPTO - CRYPTOALPHA AI'],
    ['Período:', report.periodLabel],
    ['Rango:', `${report.startDate} a ${report.endDate}`],
    ['Fecha de Generación:', new Date().toLocaleString('es-ES')],
    [],
    ['MÉTRICAS MACROECONÓMICAS Y DEL MERCADO CRIPTO 24/7'],
    ['Rendimiento Global Mercado (%):', report.marketSummary.overallMarketReturnPct],
    ['Dominancia de Bitcoin (%):', report.marketSummary.btcDominancePct || 58.4],
    ['Dominancia de Ethereum (%):', report.marketSummary.ethDominancePct || 13.8],
    ['Volatilidad Media Anualizada (%):', report.marketSummary.averageVolatility],
    ['Sharpe Ratio Estimado:', report.marketSummary.sharpeRatioEstimate],
    ['Max Drawdown Estimado (%):', report.marketSummary.maxDrawdownEstimate],
    [],
    ['PERSPECTIVA ESTRATÉGICA IA (GEMINI 2.5 FLASH):'],
    [report.aiStrategicOutlook],
    [],
    ['PUNTOS CLAVE ON-CHAIN Y GESTIÓN DE RIESGO:'],
    ...report.macroTakeaways.map((t) => [t]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Estratégico');

  // Sheet 2: Criptomonedas & Métricas Cuantitativas
  const assetsData = assets.map((a) => ({
    'Símbolo': a.symbol.toUpperCase(),
    'Nombre Criptomoneda': a.name,
    'Sector / Ecosistema': a.sector || a.category || 'Layer 1',
    'Precio Actual (USD)': a.current_price,
    'Cap. Mercado (USD)': a.market_cap,
    'Volumen 24h (USD)': a.total_volume,
    'Var 24h (%)': a.price_change_percentage_24h,
    'Var 7d (%)': a.price_change_percentage_7d || 0,
    'Var 30d (%)': a.price_change_percentage_30d || 0,
    'Alpha Score (0-100)': a.alphaScore || 50,
    'RSI (14)': a.rsi14 || 50,
    'Ratio Anomalía Volumen': a.volumeAnomalyRatio || 1.0,
    'Funding Rate 8h (%)': a.fundingRate8h ? (a.fundingRate8h * 100) : 0.01,
    'MVRV Z-Score': a.mvrvZScore || a.mvrvScore || 1.8,
    'TVL (USD)': a.tvlUsd || a.tvl || 0,
    'Máximo Histórico (ATH)': a.ath || 0,
    'Distancia al ATH (%)': a.ath_change_percentage || 0,
    'Señal Algorítmica': a.trendSignal || 'NEUTRAL',
    'Diagnóstico de Oportunidad': a.opportunityTag || 'Consolidación',
  }));
  const wsAssets = XLSX.utils.json_to_sheet(assetsData);
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Criptomonedas & Métricas');

  // Sheet 3: Top Rendimientos
  const topData = report.topPerformers.map((t) => ({
    'Ticker': t.symbol.toUpperCase(),
    'Criptomoneda': t.name,
    'Retorno (%)': t.returnPct,
    'Volumen Acumulado': t.volumeTotal,
  }));
  const wsTop = XLSX.utils.json_to_sheet(topData);
  XLSX.utils.book_append_sheet(wb, wsTop, 'Líderes de Rendimiento');

  // Download
  XLSX.writeFile(wb, `CryptoAlpha_Dataset_${report.period}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
