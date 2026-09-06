import { CryptoAsset, SimulatedTrade } from '../types';

export interface CalculatedTradeMetrics {
  trade: SimulatedTrade;
  entryPrice: number;
  currentPrice: number;
  invested: number;
  shares: number;
  leverage: number;
  pnlEur: number;
  pnlPct: number;
  currentPositionValueEur: number;
  isProfitable: boolean;
  pricePctChange: number;
  liquidationPriceUsd?: number;
  
  // TP / SL analytics
  tpPrice?: number;
  tpPct?: number;
  tpReached: boolean;
  tpDistancePct?: number;
  tpProfitEur?: number;
  
  slPrice?: number;
  slPct?: number;
  slReached: boolean;
  slDistancePct?: number;
  slRiskEur?: number;
}

export interface PortfolioBrokerSummary {
  totalInvestedEur: number;
  totalCurrentValueEur: number;
  totalPnlEur: number;
  totalPnlPct: number;
  openCount: number;
  closedCount: number;
  
  // Closed history metrics
  totalRealizedPnlEur: number;
  totalRealizedInvestedEur: number;
  totalRealizedPnlPct: number;
  winningTradesCount: number;
  losingTradesCount: number;
  winRatePct: number;
  bestTradeEur: number;
  worstTradeEur: number;
}

/**
 * Calculates live real-time metrics for simulated crypto Spot and Leveraged Futures positions.
 */
export function calculateTradeMetrics(
  trade: SimulatedTrade,
  assets: CryptoAsset[]
): CalculatedTradeMetrics {
  const liveAsset = assets.find(
    (a) => a.symbol.toLowerCase() === trade.symbol.toLowerCase() || a.id === trade.assetId
  );

  const entryPrice = Math.max(0.00000001, trade.entryPriceUsd || trade.entryPriceEur || 100);
  const currentPrice = liveAsset ? liveAsset.current_price : entryPrice;
  const invested = Math.max(0, trade.investedEur || trade.investedAmountEur || (trade.shares * entryPrice));
  const leverage = trade.leverage && trade.leverage > 1 ? trade.leverage : 1;
  
  const shares = trade.shares > 0 ? trade.shares : ((invested * leverage) / entryPrice);

  let pricePctChange = 0;
  let pnlEur = 0;
  let pnlPct = 0;
  let currentPositionValueEur = invested;

  if (trade.type === 'BUY') {
    // Spot Buy or Long Futures
    pricePctChange = ((currentPrice - entryPrice) / entryPrice) * 100;
    pnlPct = pricePctChange * leverage;
    pnlEur = invested * (pnlPct / 100);
    currentPositionValueEur = Math.max(0, invested + pnlEur);
  } else {
    // Short Futures
    pricePctChange = ((entryPrice - currentPrice) / entryPrice) * 100;
    pnlPct = pricePctChange * leverage;
    pnlEur = invested * (pnlPct / 100);
    currentPositionValueEur = Math.max(0, invested + pnlEur);
  }

  // Calculate liquidation price for leveraged futures (e.g. 100% loss of margin)
  let liquidationPriceUsd = trade.liquidationPriceUsd;
  if (leverage > 1 && !liquidationPriceUsd) {
    const maintMarginPct = 0.01;
    if (trade.type === 'BUY') {
      liquidationPriceUsd = entryPrice * (1 - (1 / leverage) + maintMarginPct);
    } else {
      liquidationPriceUsd = entryPrice * (1 + (1 / leverage) - maintMarginPct);
    }
  }

  // Take Profit calculations
  let tpPrice = trade.takeProfitPrice;
  let tpPct = trade.takeProfitPct;
  if (!tpPrice && trade.takeProfitEur && invested > 0) {
    tpPct = (trade.takeProfitEur / invested) * 100;
  }
  if (!tpPrice && tpPct) {
    tpPrice = trade.type === 'BUY'
      ? entryPrice * (1 + (tpPct / leverage) / 100)
      : entryPrice * (1 - (tpPct / leverage) / 100);
  }
  const tpProfitEur = tpPct ? (invested * tpPct) / 100 : (trade.takeProfitEur || undefined);

  let tpReached = false;
  let tpDistancePct: number | undefined = undefined;
  if (tpPrice && tpPrice > 0) {
    if (trade.type === 'BUY') {
      tpReached = currentPrice >= tpPrice;
      tpDistancePct = ((tpPrice - currentPrice) / currentPrice) * 100;
    } else {
      tpReached = currentPrice <= tpPrice;
      tpDistancePct = ((currentPrice - tpPrice) / currentPrice) * 100;
    }
  }

  // Stop Loss calculations
  let slPrice = trade.stopLossPrice;
  let slPct = trade.stopLossPct;
  if (!slPrice && trade.stopLossEur && invested > 0) {
    slPct = (trade.stopLossEur / invested) * 100;
  }
  if (!slPrice && slPct) {
    slPrice = trade.type === 'BUY'
      ? entryPrice * (1 - (slPct / leverage) / 100)
      : entryPrice * (1 + (slPct / leverage) / 100);
  }
  const slRiskEur = slPct ? (invested * slPct) / 100 : (trade.stopLossEur || undefined);

  let slReached = false;
  let slDistancePct: number | undefined = undefined;
  if (slPrice && slPrice > 0) {
    if (trade.type === 'BUY') {
      slReached = currentPrice <= slPrice;
      slDistancePct = ((currentPrice - slPrice) / currentPrice) * 100;
    } else {
      slReached = currentPrice >= slPrice;
      slDistancePct = ((slPrice - currentPrice) / currentPrice) * 100;
    }
  }

  return {
    trade,
    entryPrice: Number(entryPrice.toFixed(entryPrice < 1 ? 6 : 2)),
    currentPrice: Number(currentPrice.toFixed(currentPrice < 1 ? 6 : 2)),
    invested: Number(invested.toFixed(2)),
    shares: Number(shares.toFixed(shares < 1 ? 6 : 4)),
    leverage,
    pnlEur: Number(pnlEur.toFixed(2)),
    pnlPct: Number(pnlPct.toFixed(2)),
    currentPositionValueEur: Number(currentPositionValueEur.toFixed(2)),
    isProfitable: pnlEur >= 0,
    pricePctChange: Number(pricePctChange.toFixed(2)),
    liquidationPriceUsd: liquidationPriceUsd ? Number(liquidationPriceUsd.toFixed(entryPrice < 1 ? 6 : 2)) : undefined,
    tpPrice: tpPrice ? Number(tpPrice.toFixed(entryPrice < 1 ? 6 : 2)) : undefined,
    tpPct: tpPct ? Number(tpPct.toFixed(2)) : undefined,
    tpReached,
    tpDistancePct: tpDistancePct !== undefined ? Number(tpDistancePct.toFixed(2)) : undefined,
    tpProfitEur: tpProfitEur ? Number(tpProfitEur.toFixed(2)) : undefined,
    slPrice: slPrice ? Number(slPrice.toFixed(entryPrice < 1 ? 6 : 2)) : undefined,
    slPct: slPct ? Number(slPct.toFixed(2)) : undefined,
    slReached,
    slDistancePct: slDistancePct !== undefined ? Number(slDistancePct.toFixed(2)) : undefined,
    slRiskEur: slRiskEur ? Number(slRiskEur.toFixed(2)) : undefined,
  };
}

/**
 * Calculates complete aggregate metrics across all open and closed trades.
 */
export function calculatePortfolioSummary(
  trades: SimulatedTrade[],
  assets: CryptoAsset[]
): PortfolioBrokerSummary {
  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');

  let totalInvestedEur = 0;
  let totalCurrentValueEur = 0;

  openTrades.forEach((t) => {
    const metrics = calculateTradeMetrics(t, assets);
    totalInvestedEur += metrics.invested;
    totalCurrentValueEur += metrics.currentPositionValueEur;
  });

  const totalPnlEur = totalCurrentValueEur - totalInvestedEur;
  const totalPnlPct = totalInvestedEur > 0 ? (totalPnlEur / totalInvestedEur) * 100 : 0;

  // Closed Trades Analysis
  let totalRealizedPnlEur = 0;
  let totalRealizedInvestedEur = 0;
  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let bestTradeEur = 0;
  let worstTradeEur = 0;

  closedTrades.forEach((t) => {
    const pnl = t.realizedPnlEur !== undefined ? t.realizedPnlEur : 0;
    const inv = t.investedEur || t.investedAmountEur || 0;
    totalRealizedPnlEur += pnl;
    totalRealizedInvestedEur += inv;

    if (pnl > 0) {
      winningTradesCount++;
    } else if (pnl < 0) {
      losingTradesCount++;
    }

    if (pnl > bestTradeEur) bestTradeEur = pnl;
    if (pnl < worstTradeEur) worstTradeEur = pnl;
  });

  const totalRealizedPnlPct = totalRealizedInvestedEur > 0 
    ? (totalRealizedPnlEur / totalRealizedInvestedEur) * 100 
    : 0;
  const winRatePct = closedTrades.length > 0 
    ? (winningTradesCount / closedTrades.length) * 100 
    : 0;

  return {
    totalInvestedEur: Number(totalInvestedEur.toFixed(2)),
    totalCurrentValueEur: Number(totalCurrentValueEur.toFixed(2)),
    totalPnlEur: Number(totalPnlEur.toFixed(2)),
    totalPnlPct: Number(totalPnlPct.toFixed(2)),
    openCount: openTrades.length,
    closedCount: closedTrades.length,
    totalRealizedPnlEur: Number(totalRealizedPnlEur.toFixed(2)),
    totalRealizedInvestedEur: Number(totalRealizedInvestedEur.toFixed(2)),
    totalRealizedPnlPct: Number(totalRealizedPnlPct.toFixed(2)),
    winningTradesCount,
    losingTradesCount,
    winRatePct: Number(winRatePct.toFixed(1)),
    bestTradeEur: Number(bestTradeEur.toFixed(2)),
    worstTradeEur: Number(worstTradeEur.toFixed(2)),
  };
}

/**
 * Calculates new order projections with exact Target, Stop Loss and Liquidation levels.
 */
export function calculateOrderProjections({
  entryPrice,
  amountEur,
  orderType,
  leverage = 1,
  tpPct,
  slPct,
}: {
  entryPrice: number;
  amountEur: number;
  orderType: 'BUY' | 'SELL';
  leverage?: number;
  tpPct: number;
  slPct: number;
}) {
  const safeEntry = Math.max(0.00000001, entryPrice);
  const lev = Math.max(1, leverage);
  const totalPositionSize = amountEur * lev;
  const shares = totalPositionSize / safeEntry;

  // Target prices
  let tpPrice = 0;
  let slPrice = 0;

  if (orderType === 'BUY') {
    tpPrice = safeEntry * (1 + (tpPct / lev) / 100);
    slPrice = safeEntry * (1 - (slPct / lev) / 100);
  } else {
    tpPrice = safeEntry * (1 - (tpPct / lev) / 100);
    slPrice = safeEntry * (1 + (slPct / lev) / 100);
  }

  const estimatedProfitEur = (amountEur * tpPct) / 100;
  const estimatedRiskEur = (amountEur * slPct) / 100;
  const riskRewardRatio = slPct > 0 ? tpPct / slPct : 0;

  return {
    shares: Number(shares.toFixed(safeEntry < 1 ? 6 : 4)),
    tpPrice: Number(tpPrice.toFixed(safeEntry < 1 ? 6 : 2)),
    slPrice: Number(slPrice.toFixed(safeEntry < 1 ? 6 : 2)),
    estimatedProfitEur: Number(estimatedProfitEur.toFixed(2)),
    estimatedRiskEur: Number(estimatedRiskEur.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
  };
}
