export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d?: number;
  price_change_percentage_30d?: number;
  price_change_percentage_1y?: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  last_updated: string;
  sector?: string; // e.g. 'Layer 1', 'Layer 2 / Rollup', 'DeFi 3.0', 'IA & Big Data', 'RWA & Tokenización', 'DePIN & Infraestructura', 'Meme Coins', 'Staking Líquido'
  blockchain?: string;
  consensusMechanism?: string; // e.g. 'Proof-of-Stake', 'Proof-of-Work', 'Optimistic Rollup', 'ZK-Rollup', 'DAG'
  stakingApy?: number; // e.g. 5.4%
  tvlUsd?: number; // DeFi Total Value Locked
  mvrvZScore?: number; // On-Chain Valuation metric
  fundingRate8h?: number; // Perpetual Funding Rate (e.g. +0.01%)
  longShortRatio?: number; // e.g. 1.85
  exchangeNetflow24h?: number; // Net Inflow/Outflow (negative = accumulation/outflow from exchanges)
  contractAddress?: string;
  sparkline_in_7d?: {
    price: number[];
  };
  // Compatibility helpers & quantitative metrics
  category?: string;
  tvl?: number;
  mvrvScore?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  beta?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  alphaScore?: number;
  volatilityScore?: number;
  volumeAnomalyRatio?: number; // Volume vs 20d average (Z-Score ratio)
  rsi14?: number;
  macdSignal?: 'bullish' | 'bearish' | 'neutral';
  trendSignal?: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  opportunityTag?: string;
}

// Alias for backwards-compatibility
export type StockAsset = CryptoAsset;

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicatorsResult {
  rsi: {
    current: number;
    series: { time: number; value: number }[];
    signal: 'oversold' | 'overbought' | 'neutral';
  };
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    series: { time: number; macd: number; signal: number; hist: number }[];
    crossover: 'bullish_cross' | 'bearish_cross' | 'none';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
    isSqueeze: boolean;
  };
  ema: {
    ema20: number;
    ema50: number;
    ema200: number;
    goldenCross: boolean;
    deathCross: boolean;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  atr: {
    value: number;
    volatilityLevel: 'baja' | 'moderada' | 'alta' | 'extrema';
  };
  stochastic: {
    k: number;
    d: number;
    signal: 'oversold' | 'overbought' | 'neutral';
  };
  volumeAnalysis: {
    currentVsAverageRatio: number;
    isVolumeSpike: boolean;
    zScore: number;
    obvTrend: 'acumulacion' | 'distribucion' | 'neutral';
  };
  pivotPoints: {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
  overallSignal: {
    score: number; // 0 to 100
    recommendation: 'COMPRA FUERTE' | 'COMPRA' | 'NEUTRAL' | 'VENTA' | 'VENTA FUERTE';
    confidence: number;
    summary: string;
  };
}

export interface AiPredictionReport {
  assetSymbol: string;
  assetName: string;
  currentPrice: number;
  timestamp: string;
  opportunityScore: number; // 0 - 100
  marketRegime: 'Tendencia Alcista Fuerte' | 'Acumulación de Ballenas' | 'Rango Lateral / Squeeze' | 'Distribución Institucional' | 'Corrección / Bajista';
  projections: {
    timeframe24h: { target: number; changePct: number; probability: number; rationale: string };
    timeframe7d: { target: number; changePct: number; probability: number; rationale: string };
    timeframe30d: { target: number; changePct: number; probability: number; rationale: string };
    timeframe1y: { target: number; changePct: number; probability: number; rationale: string };
  };
  supportAndResistance: {
    keySupport: number;
    keyResistance: number;
    stopLossRecommended: number;
    takeProfitRecommended: number;
    riskRewardRatio: number;
  };
  catalystsAndRisks: {
    bullishCatalysts: string[];
    bearishRisks: string[];
    volumeVolatilityDiagnosis: string;
  };
  onChainIntelligence?: {
    mvrvZScoreDiagnosis: string;
    whaleAccumulationVerdict: string;
    fundingRateSentiment: string;
    cycleStage: string;
  };
  executiveVerdict: string;
  groundingSources?: { title: string; url: string }[];
}

export interface MarketAlert {
  id: string;
  assetSymbol: string;
  assetName: string;
  type: 'volume_spike' | 'volatility_breakout' | 'rsi_extreme' | 'price_target' | 'ema_cross' | 'ai_opportunity' | 'whale_transfer' | 'funding_extreme';
  condition: 'above' | 'below' | 'cross' | 'spike';
  targetValue: number;
  description: string;
  createdAt: string;
  triggered?: boolean;
  lastTriggeredAt?: string;
  enabled: boolean;
}

export interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
  source: 'manual' | 'wallet_metamask' | 'wallet_phantom' | 'wallet_coinbase' | 'wallet_trust' | 'wallet_ledger' | 'wallet_sui' | 'wallet_keplr' | 'wallet_address' | 'exchange_binance' | 'exchange_coinbase' | 'exchange_bybit' | 'exchange_okx' | 'exchange_kraken' | 'broker_ibkr' | 'broker_schwab';
  walletAddress?: string;
  blockchainNetwork?: string;
  lastSynced?: string;
}

export interface SimulatedTrade {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  image: string;
  sector?: string;
  type: 'BUY' | 'SELL'; // Spot Buy or Short Futures
  tradeMode?: 'SPOT' | 'FUTURES_ISOLATED' | 'FUTURES_CROSS';
  leverage?: number; // 1x to 20x
  investedEur: number;
  investedAmountEur?: number;
  entryPriceEur: number;
  entryPriceUsd: number;
  shares: number; // Crypto token amount
  openedAt: string;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string;
  exitPriceUsd?: number;
  exitPriceEur?: number;
  realizedPnlEur?: number;
  realizedPnlPct?: number;
  liquidationPriceUsd?: number;
  takeProfitEur?: number;
  takeProfitPct?: number;
  takeProfitPrice?: number;
  stopLossEur?: number;
  stopLossPct?: number;
  stopLossPrice?: number;
  strategyTag?: string;
  exchangeRateEurUsd?: number;
  closeReason?: 'manual' | 'take_profit' | 'stop_loss' | 'liquidation';
  convictionTier?: 'ALTA_CONVICCION_100' | 'RIESGO_CONTROLADO_50';
  convictionLabel?: string;
  convictionRationale?: string;
}

export interface GlobalMarketData {
  totalMarketCapUsd: number;
  total24hVolumeUsd: number;
  totalMarketCap?: number;
  btcDominance: number; // e.g. 58.4%
  ethDominance: number; // e.g. 14.2%
  solDominance?: number; // e.g. 3.8%
  stablecoinMarketCapUsd?: number; // e.g. $185B
  marketCapChangePercentage24h: number;
  liquidations24hTotalUsd?: number;
  liquidations24hLongUsd?: number;
  liquidations24hShortUsd?: number;
  ethGasGwei?: number;
  fearAndGreedIndex: {
    value: number;
    classification: string;
    historicalValues?: { value: number; classification: string; timestamp: string }[];
  };
  fearGreedIndex?: {
    value: number;
    classification: string;
  };
  activeCryptocurrencies: number;
  activeStocks?: number;
  updatedAt: string;
}

export interface PeriodStudyReport {
  period: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';
  periodLabel: string;
  startDate: string;
  endDate: string;
  topPerformers: { symbol: string; name: string; returnPct: number; volumeTotal: number }[];
  worstPerformers: { symbol: string; name: string; returnPct: number; volumeTotal: number }[];
  marketSummary: {
    btcReturnPct: number;
    ethReturnPct: number;
    solReturnPct?: number;
    btcDominancePct?: number;
    ethDominancePct?: number;
    overallMarketReturnPct: number;
    averageVolatility: number;
    sharpeRatioEstimate: number;
    maxDrawdownEstimate: number;
    totalLiquidationsEstUsd?: number;
  };
  sectorAnalysis: { sector: string; avgReturn: number; dominance: number }[];
  macroTakeaways: string[];
  aiStrategicOutlook: string;
}

export interface MarketSessionInfo {
  name: string;
  region: string;
  status: 'OPEN' | 'HIGH_LIQUIDITY' | 'MODERATE_LIQUIDITY' | 'LOW_LIQUIDITY' | 'WEEKEND_ACTIVE';
  hours: string;
  isMainDriver?: boolean;
}

export interface CryptoOfTheDaySignal {
  asset: CryptoAsset;
  ignitionStatus: 'ZONA_DE_COMPRA_ACTIVA' | 'Ruptura Inminente' | 'Impulso Inicial' | 'Zona Límite';
  buyZoneMin: number;
  buyZoneMax: number;
  optimalEntryPrice: number;
  currentPrice: number;
  remainingUpsidePct: number;
  takeProfit1: {
    price: number;
    percentage: number;
    description: string;
    action: string;
  };
  takeProfit2: {
    price: number;
    percentage: number;
    description: string;
    action: string;
  };
  takeProfitMax: {
    price: number;
    percentage: number;
    description: string;
    action: string;
  };
  stopLoss: {
    price: number;
    percentage: number;
    description: string;
  };
  riskRewardRatio: number;
  estimatedHoldingPeriod: string;
  confidenceScore: number;
  volumeZScore: number;
  rsiCurrent: number;
  breakoutTrigger: string;
  catalysts: string[];
  riskWarnings: string[];
  executionStrategy: {
    step1: string;
    step2: string;
    step3: string;
  };
  calculatedAt: string;

  // Real-Time 24/7 Global Crypto Market Session Dynamics
  sessionContext?: {
    currentTimeUtc: string;
    marketStatusLabel: string;
    sessionPhase: 'ASIA_SESSION' | 'LONDON_OPEN' | 'NY_OPEN' | 'NY_AFTERNOON' | 'WEEKEND_VOLATILITY';
    activeSessions: MarketSessionInfo[];
    liquidityDrainWarning?: string;
    fundingRateState?: string;
  };

  // Intraday Momentum Health & Exhaustion Diagnosis
  momentumHealth?: {
    exhaustionScore: number; // 0-100 (0-30 = Intacta, 31-65 = Saludable, 66-85 = Alerta, 86-100 = Agotada)
    momentumStatus: 'FUERZA_INTACTA_EXPANSION' | 'EN_DESPEGUE_SALUDABLE' | 'MODERADO_CONSOLIDACION' | 'SOBREEXTENDIDO_AGOTADO';
    momentumStatusLabel: string;
    vwapProximity: 'POR_ENCIMA_DE_VWAP' | 'EN_RETESTEO_VWAP' | 'POR_DEBAJO_DE_VWAP';
    derivativesSqueezePotential: 'ALTO' | 'MODERADO' | 'BAJO';
    exhaustionRationale: string;
    gainAccumulatedTodayPct: number;
    remainingEnergyPct: number;
  };

  // Comprehensive Risk/Reward Robustness & Expected Value
  riskRewardAnalysis?: {
    ratio: number;
    robustnessGrade: 'A+' | 'A' | 'B+' | 'B' | 'C';
    robustnessExplanation: string;
    expectedValuePer100Arrisk: number;
    winRateProjected: number;
    profitFactorEstimated: number;
    invalidationThreshold: string;
    optimalOrderType: 'LIMITE_ESCALONADA' | 'STOP_LIMIT_BREAKOUT' | 'MERCADO_EN_RETROCESO';
    asymmetryScore: number;
  };

  // Tactical Execution Intelligence
  tacticalExecution?: {
    recommendedTimeframe: 'INTRADIA_SCALPING' | 'SWING_CORTO_2_5D' | 'POSITION_CYCLE_1_3M';
    whaleAccumulationRatio: number;
    rvol20: number;
    macroAlignment: string;
    onChainFootprint: string;
    bestExecutionWindow: string;
  };
}

export type StockOfTheDaySignal = CryptoOfTheDaySignal;

// 1. Backtesting Types
export interface BacktestTrade {
  id: string;
  ticker: string;
  entryDate: string;
  exitDate: string;
  type: 'COMPRA' | 'VENTA';
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnlDollar: number;
  pnlPercentage: number;
  exitReason: 'TP1' | 'TP2' | 'TP3' | 'Stop Loss' | 'Trailing Stop' | 'Cierre de Ciclo';
  durationDays: number;
}

export interface BacktestResult {
  ticker: string;
  strategyName: string;
  period: '3M' | '6M' | '1Y';
  initialCapital: number;
  finalCapital: number;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  winRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  avgTradeDurationDays: number;
  equityCurve: { date: string; strategyEquity: number; benchmarkEquity: number; drawdown: number }[];
  trades: BacktestTrade[];
}

// 2. Whale Flow & Derivatives Intelligence
export interface WhaleTransactionItem {
  id: string;
  symbol: string;
  coinName: string;
  timestamp: string;
  amountCoins: number;
  dollarValue: number;
  fromType: 'Exchange' | 'Unknown Wallet' | 'Miner Pool' | 'DeFi Treasury' | 'Custodian';
  toType: 'Exchange' | 'Unknown Wallet' | 'Cold Storage' | 'Staking Contract';
  sentiment: 'ACUMULACION_BALLENA' | 'DISTRIBUCION_VENTA' | 'TRASPASO_INTERNO';
  tier: 'Mega Whale ($50M+)' | 'Large Whale ($10M+)' | 'Standard Whale ($2M+)';
  txHash: string;
}

export interface DerivativesLiquidationsItem {
  id: string;
  symbol: string;
  timestamp: string;
  side: 'LONG_LIQUIDATION' | 'SHORT_LIQUIDATION';
  price: number;
  liquidatedValueUsd: number;
  exchange: 'Binance' | 'Bybit' | 'OKX' | 'Deribit';
  fundingRate: number;
  openInterestChangePct: number;
  sentiment: 'BULLISH_REVERSAL_CASCADE' | 'BEARISH_PRESSURE';
}

export interface InstitutionalTickerSummary {
  ticker: string;
  companyName: string;
  institutionalAccumulationScore: number; // 0 to 100
  netExchangeFlowMillionUsd: number; // Negative is outflow (bullish accumulation)
  fundingRate8hPct: number;
  longShortRatio: number;
  flowSentiment: 'Muy Alcista (Acumulación Fuerte)' | 'Alcista' | 'Neutral' | 'Bajista';
  divergenceAlert?: string;
}

export interface DarkPoolBlockTrade {
  id: string;
  ticker: string;
  companyName: string;
  timestamp: string;
  price: number;
  size: number;
  dollarValue: number;
  venue: string;
  sentiment: 'ACUMULACION_INSTITUCIONAL' | 'DISTRIBUCION_VENTA' | 'CRUCE_NEUTRAL';
  premiumTier: string;
  priceVsMarketPct?: number;
}

export type UnusualOptionFlowItem = DerivativesLiquidationsItem;

// 3. Multi-Timeframe & Squeeze Momentum Types
export interface TimeframeSignal {
  timeframe: '15m' | '1h' | '1D';
  trend: 'ALCISTA' | 'NEUTRAL' | 'BAJISTA';
  rsi: number;
  emaTrend: 'Sobre EMA 20' | 'Bajo EMA 20' | 'Cruce Alcista 20/50';
  squeezeStatus: 'COMPRESION_ACTIVA' | 'EXPANSION_ALCISTA' | 'EXPANSION_BAJISTA' | 'SIN_SQUEEZE';
}

export interface MultiTimeframeAssetAnalysis {
  asset: CryptoAsset;
  confluenceScore: number; // 0 - 100
  confluenceRating: 'SUPER CONFLUENCIA (3/3)' | 'CONFLUENCIA ALTA (2/3)' | 'NEUTRAL' | 'DIVERGENCIA';
  signals: {
    m15: TimeframeSignal;
    h1: TimeframeSignal;
    d1: TimeframeSignal;
  };
  squeezeMomentum: {
    status: 'Squeeze On (Listo para detonar)' | 'Firing Long (Expansión Alcista)' | 'Neutral / Rango';
    intensityPct: number;
    detonationProbabilityPct: number;
    readinessStage: 'IGNICION_INMINENTE' | 'ALTA_PRESION' | 'COMPRESION_MADURA' | 'FIRING_LONG' | 'NEUTRAL';
    stageLabel: string;
    compressionBarsCount: number;
    momentumVectorSlope: 'FUERTEMENTE_CRECIENTE' | 'ACELERANDO' | 'ESTABLE' | 'DECRECIENTE';
    bandwidthPct: number;
    keltnerInsideRatio: number;
    projectedBreakoutTarget: {
      direction: 'ALCISTA' | 'BAJISTA';
      targetPrice: number;
      projectedGainPct: number;
      recommendedStopLoss: number;
      riskRewardRatio: number;
    };
    detonationFactors: {
      compressionScore: number;
      momentumTurnScore: number;
      institutionalVolumeScore: number;
      multiTfConfluenceScore: number;
    };
    expertVerdict: string;
  };
  sectorRelativeStrength: {
    sector: string;
    vsBtcPerformance: number;
    rotationRank: number;
  };
  catalystInfo?: CryptoCatalystEvent;
}

export interface CryptoCatalystEvent {
  symbol: string;
  eventName: string;
  eventDateFormatted: string;
  daysUntil: number;
  isImminent: boolean;
  eventType: 'NETWORK_UPGRADE' | 'HALVING_CYCLE' | 'TOKEN_UNLOCK' | 'ETF_FLOW' | 'MAINNET_LAUNCH' | 'CONFERENCE';
  eventTypeLabel: string;
  estimatedImpact: string;
  impliedVolatilityMovePct: number;
  squeezeCompatibility: 'ALERTA_RIESGO_BINARIO' | 'CATALIZADOR_EXPANSION' | 'VENTANA_SEGURA';
  squeezeCompatibilityLabel: string;
  catalystNote: string;
}

// Alias for compatibility
export type EarningsCatalystEvent = CryptoCatalystEvent;

// 4. Institutional Crypto Research & On-Chain Consensus Matrix
export interface RealAnalystRecommendationTrendItem {
  period: string; // '0m', '-1m', '-2m', '-3m'
  periodLabel: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
}

export interface RealAnalystBrokerAction {
  date: string;
  timestamp: number;
  firm: string; // e.g. Glassnode, CryptoQuant, Arkham, Messari, Delphi Digital, CoinShares, Bloomberg Crypto
  action: string; // 'Acumulación Fuerte', 'Mejora de Calificación', 'Mantiene Acumulación', 'Toma Parcial de Ganancias'
  rawAction?: string;
  toGrade: string;
  fromGrade: string;
}

export interface RealTopInstitutionalHolder {
  name: string;
  shares: number; // Token quantity
  value: number;
  pctHeld: number;
}

export interface RealAnalystReportData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  isLiveRealData: boolean;
  lastUpdated: string;
  wallStreetConsensus: {
    targetHigh: number;
    targetLow: number;
    targetMean: number;
    targetMedian: number;
    upsidePct: number;
    recommendationMean: number;
    recommendationKey: string;
    recommendationLabel: string;
    totalAnalysts: number;
  };
  timeframeTargets: {
    '1W': { targetPrice: number; changePct: number; basis: string };
    '1M': { targetPrice: number; changePct: number; basis: string };
    '3M': { targetPrice: number; changePct: number; basis: string };
    '1Y': { targetPrice: number; changePct: number; basis: string };
  };
  recommendationTrend: RealAnalystRecommendationTrendItem[];
  recentRatingActions: RealAnalystBrokerAction[];
  institutionalOwnership: {
    institutionsPercentHeld: number; // Treasury & Funds %
    insidersPercentHeld: number; // Founding Team %
    shortPercentOfFloat: number; // Funding short exposure %
    topHolders: RealTopInstitutionalHolder[];
  };
  onChainMetrics?: {
    mvrvZScore: number;
    nvtRatio: number;
    puellMultiple: number;
    stockToFlowDeviationPct: number;
    exchangeReservesChange30dPct: number;
    activeAddresses24h: number;
    realizedPriceUsd: number;
  };
}

// 5. Autonomous Quant Trading Bot Interfaces
export type BotStrategyType = 
  | 'MULTI_TIMEFRAME_MOMENTUM' 
  | 'GRID_TRADING_DCA' 
  | 'RSI_MEAN_REVERSION' 
  | 'WHALE_FLOW_MOMENTUM' 
  | 'QUANT_ALPHA_AI' 
  | 'BREAKOUT_VOLATILITY';

export type BotRiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'QUANT_INSTITUTIONAL';

export interface BotTradeLog {
  id: string;
  timestamp: string;
  type: 'SCAN' | 'ORDER_BUY' | 'ORDER_SELL' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'REBALANCE' | 'SIGNAL_ALERT';
  symbol: string;
  price: number;
  message: string;
  strategy: string;
  details?: Record<string, any>;
}

export interface BotConfiguration {
  id: string;
  name: string;
  isActive: boolean;
  strategy: BotStrategyType;
  riskProfile: BotRiskProfile;
  executionIntervalSeconds: number; // e.g. 5, 10, 15, 30, 60
  capitalAllocatedEur: number; // 1000 € default
  tradeSizeEur: number; // Fallback or current
  dynamicSizingMode: 'RISK_ADAPTIVE_50_100' | 'FIXED';
  tradeSizeLowEur: number; // 50 € for controlled risk
  tradeSizeHighEur: number; // 100 € for high conviction
  highConvictionThreshold: number; // Alpha score threshold (e.g. 82)
  maxOpenPositions: number;
  takeProfitPct: number;
  stopLossPct: number;
  trailingStopEnabled: boolean;
  trailingStopPct: number;
  maxDailyDrawdownPct: number;
  allowedAssetSymbols: string[]; // e.g. ['BTC', 'ETH', 'SOL', 'SUI', 'TAO', 'RENDER', 'AAVE', 'LINK']
  autoCompoundProfits: boolean;
  leverage: number; // 1x Spot to 5x Isolated
  orderType: 'SPOT' | 'FUTURES';
  minAlphaScoreToEnter: number; // e.g. 75
  lastRunTimestamp?: string;
  createdAt: string;
}

export interface BotPerformanceMetrics {
  initialCapitalEur: number;
  currentBalanceEur: number;
  availableCashEur: number;
  investedCapitalEur: number;
  totalPnlEur: number;
  totalPnlPct: number;
  unrealizedPnlEur: number;
  realizedPnlEur: number;
  winRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  avgTradeDurationMinutes: number;
  bestTradePnlPct: number;
  worstTradePnlPct: number;
  uptimeHours: number;
  lastExecutionTime: string;
  equityCurve: { timestamp: number; time: string; equityEur: number; benchmarkBtcEur: number; drawdownPct: number }[];
}

export interface AlpacaAccountInfo {
  connected: boolean;
  accountNumber?: string;
  status?: string;
  cryptoStatus?: string;
  currency?: string;
  cash: number;
  portfolioValue: number;
  buyingPower: number;
  equity: number;
  isPaper: boolean;
  endpoint: string;
  error?: string;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  qty_available: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  change_today: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  status: string;
  notional?: string;
  qty?: string;
  filled_qty?: string;
  filled_avg_price?: string;
  created_at: string;
  submitted_at: string;
  filled_at?: string;
}

export interface AlpacaActivity {
  id: string;
  activity_type: string;
  transaction_time: string;
  type: string;
  price: string;
  qty: string;
  side: 'buy' | 'sell';
  symbol: string;
  order_id: string;
  cum_qty?: string;
  order_status?: string;
}

export interface AlpacaPortfolioHistory {
  timestamp: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
  base_value: number;
  timeframe: string;
}

export type AlpacaBotRoutingMode = 'both' | 'scalp_only' | 'quant_only' | 'none';

export interface AlpacaBotRoutingConfig {
  scalpEnabled: boolean;
  quantEnabled: boolean;
  mode?: AlpacaBotRoutingMode;
  lastUpdated?: string;
}

