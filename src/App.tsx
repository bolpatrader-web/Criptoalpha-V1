import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  HomeHub 
} from './components/HomeHub';
import { 
  CryptoOfTheDay 
} from './components/CryptoOfTheDay';
import { 
  OpportunitiesScreener 
} from './components/OpportunitiesScreener';
import { 
  AssetDetailModal 
} from './components/AssetDetailModal';
import { 
  MasterDiagnosticModal 
} from './components/MasterDiagnosticModal';
import { 
  AiPredictiveHub 
} from './components/AiPredictiveHub';
import { 
  AlertsManager 
} from './components/AlertsManager';
import { 
  PortfolioSync 
} from './components/PortfolioSync';
import { 
  PeriodicalReports 
} from './components/PeriodicalReports';
import { 
  BacktestingEngine 
} from './components/BacktestingEngine';
import { 
  InstitutionalFlowRadar 
} from './components/InstitutionalFlowRadar';
import { 
  MultiTimeframeScanner 
} from './components/MultiTimeframeScanner';
import { 
  SimpleBrokerModal 
} from './components/SimpleBrokerModal';
import { 
  AutonomousBotHub 
} from './components/AutonomousBotHub';
import { 
  ScalpingBotHub 
} from './components/ScalpingBotHub';
import { 
  AlpacaDashboardModal 
} from './components/AlpacaDashboardModal';
import { 
  CloudSyncStatusModal 
} from './components/CloudSyncStatusModal';
import { 
  StockAsset, 
  GlobalMarketData, 
  MarketAlert, 
  PortfolioAsset,
  SimulatedTrade 
} from './types';
import { ScalpingTrade } from './utils/scalpingBotEngine';
import { INITIAL_STOCKS, INITIAL_GLOBAL_DATA } from './data/initialStocks';
import { safeFetchJson } from './utils/api';
import { calculateTradeMetrics, calculatePortfolioSummary } from './utils/simulationBrokerEngine';
import { 
  subscribeToSyncChannel, 
  publishToSyncChannel,
  getIsCloudQuotaExceeded 
} from './utils/cloudSync';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

export default function App() {
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<'home' | 'quant_bot' | 'scalping_bot' | 'crypto_of_the_day' | 'opportunities' | 'multi_timeframe' | 'institutional_flow' | 'backtesting' | 'ai_predictions' | 'alerts' | 'portfolio' | 'reports'>('home');
  const [isExpertMode, setIsExpertMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cuota de Firestore
  const [isCloudQuotaExceeded, setIsCloudQuotaExceeded] = useState<boolean>(() => getIsCloudQuotaExceeded());
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsCloudQuotaExceeded(true);
    };
    window.addEventListener('firestore_quota_exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('firestore_quota_exceeded', handleQuotaExceeded);
  }, []);

  // Live Market State with instant baseline dataset
  const [assets, setAssets] = useState<StockAsset[]>(INITIAL_STOCKS);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(INITIAL_GLOBAL_DATA);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Selected Asset for Master Diagnostic 360 Modal
  const [selectedMasterAsset, setSelectedMasterAsset] = useState<StockAsset | null>(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<boolean>(false);

  // Selected Asset for Chart Modal
  const [selectedAssetForChart, setSelectedAssetForChart] = useState<StockAsset | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);

  // Selected Asset for AI Analysis
  const [selectedAssetForAi, setSelectedAssetForAi] = useState<StockAsset | null>(null);

  // Educational Modal
  const [isEducationModalOpen, setIsEducationModalOpen] = useState<boolean>(false);

  // Alpaca Real-Time Activity & Live Portfolio Modal
  const [isAlpacaModalOpen, setIsAlpacaModalOpen] = useState<boolean>(false);

  // Cloud Sync Modal & Last Synced Timestamp
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Simple Online Crypto Broker / Exchange Simulation State (persisted in localStorage)
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState<boolean>(false);
  const [selectedBrokerAsset, setSelectedBrokerAsset] = useState<StockAsset | null>(null);
  const [brokerTrades, setBrokerTrades] = useState<SimulatedTrade[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_simulated_trades') || localStorage.getItem('stock_alpha_simulated_trades');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'trade-crypto-1',
        assetId: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        sector: 'Store of Value / L1',
        type: 'BUY',
        investedEur: 2500,
        investedAmountEur: 2500,
        entryPriceEur: 92400.0,
        entryPriceUsd: 92400.0,
        shares: 0.027056,
        openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OPEN',
        exchangeRateEurUsd: 1.0,
        strategyTag: 'Escáner Multi-Temporal (Squeeze)',
      },
      {
        id: 'trade-crypto-2',
        assetId: 'solana',
        symbol: 'sol',
        name: 'Solana',
        image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
        sector: 'Layer 1 / High TPS',
        type: 'BUY',
        investedEur: 1200,
        investedAmountEur: 1200,
        entryPriceEur: 172.50,
        entryPriceUsd: 172.50,
        shares: 6.9565,
        openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OPEN',
        exchangeRateEurUsd: 1.0,
        strategyTag: 'Oportunidades Alpha & On-Chain Flow',
      },
    ];
  });

  // Dedicated Scalping Bot Trades State (persisted in localStorage, starts empty with 0 operations)
  const [scalpingTrades, setScalpingTrades] = useState<ScalpingTrade[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_scalping_trades');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Alerts State (persisted in localStorage)
  const [alerts, setAlerts] = useState<MarketAlert[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_alerts') || localStorage.getItem('stock_alpha_alerts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'default-alert-1',
        assetSymbol: 'btc',
        assetName: 'Bitcoin',
        type: 'volume_spike',
        condition: 'spike',
        targetValue: 140,
        description: 'Pico de Volumen Institucional (> 140% de media 20d en BTC Spot & Futuros)',
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-alert-2',
        assetSymbol: 'sol',
        assetName: 'Solana',
        type: 'price_target',
        condition: 'above',
        targetValue: 200.0,
        description: 'Ruptura alcista y liquidación de cortos por encima de $200.00',
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-alert-3',
        assetSymbol: 'eth',
        assetName: 'Ethereum',
        type: 'whale_transfer',
        condition: 'spike',
        targetValue: 100000000,
        description: 'Retiro masivo de ballenas (> $100M a almacenamiento en frío / staking)',
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Portfolio State (persisted in localStorage)
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_alpha_portfolio') || localStorage.getItem('stock_alpha_portfolio');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'port-btc',
        symbol: 'btc',
        name: 'Bitcoin',
        amount: 0.65,
        buyPrice: 88400.0,
        currentPrice: 94850.0,
        source: 'wallet_ledger',
        blockchainNetwork: 'Bitcoin Mainnet',
        lastSynced: new Date().toISOString(),
      },
      {
        id: 'port-eth',
        symbol: 'eth',
        name: 'Ethereum',
        amount: 8.5,
        buyPrice: 2480.0,
        currentPrice: 2740.0,
        source: 'wallet_metamask',
        blockchainNetwork: 'Ethereum Mainnet (Staking)',
        lastSynced: new Date().toISOString(),
      },
      {
        id: 'port-sol',
        symbol: 'sol',
        name: 'Solana',
        amount: 65,
        buyPrice: 148.0,
        currentPrice: 184.5,
        source: 'wallet_phantom',
        blockchainNetwork: 'Solana Native',
        lastSynced: new Date().toISOString(),
      },
      {
        id: 'port-sui',
        symbol: 'sui',
        name: 'Sui Network',
        amount: 1800,
        buyPrice: 2.10,
        currentPrice: 3.42,
        source: 'wallet_sui',
        blockchainNetwork: 'Sui Mainnet',
        lastSynced: new Date().toISOString(),
      },
    ];
  });

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string; type: 'success' | 'alert' | 'info' } | null>(null);

  // Audio synthesizer beep for alarms
  const playAlertSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (err) {
      console.warn('Audio Context disabled or blocked:', err);
    }
  }, []);

  // Sincronización multi-dispositivo en tiempo real vía Firebase Firestore
  useEffect(() => {
    const unsubBroker = subscribeToSyncChannel<SimulatedTrade[]>('broker_trades', (remoteTrades) => {
      if (Array.isArray(remoteTrades) && remoteTrades.length > 0) {
        setBrokerTrades(remoteTrades);
        setLastSyncTime(new Date());
      }
    });

    const unsubScalp = subscribeToSyncChannel<ScalpingTrade[]>('scalping_trades', (remoteTrades) => {
      if (Array.isArray(remoteTrades) && remoteTrades.length > 0) {
        setScalpingTrades(remoteTrades);
        setLastSyncTime(new Date());
      }
    });

    const unsubAlerts = subscribeToSyncChannel<MarketAlert[]>('market_alerts', (remoteAlerts) => {
      if (Array.isArray(remoteAlerts) && remoteAlerts.length > 0) {
        setAlerts(remoteAlerts);
        setLastSyncTime(new Date());
      }
    });

    const unsubPortfolio = subscribeToSyncChannel<PortfolioAsset[]>('user_portfolio', (remotePortfolio) => {
      if (Array.isArray(remotePortfolio) && remotePortfolio.length > 0) {
        setPortfolio(remotePortfolio);
        setLastSyncTime(new Date());
      }
    });

    return () => {
      unsubBroker();
      unsubScalp();
      unsubAlerts();
      unsubPortfolio();
    };
  }, []);

  // Sync state to local storage and publish to Firebase Firestore
  const isInitialMountAlerts = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('stock_alpha_alerts', JSON.stringify(alerts));
      localStorage.setItem('crypto_alpha_alerts', JSON.stringify(alerts));
      if (isInitialMountAlerts.current) {
        isInitialMountAlerts.current = false;
        return;
      }
      publishToSyncChannel('market_alerts', alerts);
    } catch (e) {
      console.error(e);
    }
  }, [alerts]);

  const isInitialMountPortfolio = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('stock_alpha_portfolio', JSON.stringify(portfolio));
      localStorage.setItem('crypto_alpha_portfolio', JSON.stringify(portfolio));
      if (isInitialMountPortfolio.current) {
        isInitialMountPortfolio.current = false;
        return;
      }
      publishToSyncChannel('user_portfolio', portfolio);
    } catch (e) {
      console.error(e);
    }
  }, [portfolio]);

  const isInitialMountBrokerTrades = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('stock_alpha_simulated_trades', JSON.stringify(brokerTrades));
      localStorage.setItem('crypto_alpha_simulated_trades', JSON.stringify(brokerTrades));
      if (isInitialMountBrokerTrades.current) {
        isInitialMountBrokerTrades.current = false;
        return;
      }
      publishToSyncChannel('broker_trades', brokerTrades);
    } catch (e) {
      console.error(e);
    }
  }, [brokerTrades]);

  const isInitialMountScalpingTrades = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('crypto_alpha_scalping_trades', JSON.stringify(scalpingTrades));
      if (isInitialMountScalpingTrades.current) {
        isInitialMountScalpingTrades.current = false;
        return;
      }
      publishToSyncChannel('scalping_trades', scalpingTrades);
    } catch (e) {
      console.error(e);
    }
  }, [scalpingTrades]);

  const handleForceSyncAll = async () => {
    await Promise.all([
      publishToSyncChannel('broker_trades', brokerTrades, 0),
      publishToSyncChannel('scalping_trades', scalpingTrades, 0),
      publishToSyncChannel('market_alerts', alerts, 0),
      publishToSyncChannel('user_portfolio', portfolio, 0),
    ]);
    setLastSyncTime(new Date());
  };

  // Fetch live market data (Stocks)
  const fetchMarketData = useCallback(async () => {
    try {
      // 1. Fetch Market Assets
      const mRes = await safeFetchJson<StockAsset[]>('/api/stocks/markets');
      if (mRes.ok && Array.isArray(mRes.data) && mRes.data.length > 0) {
        setAssets(mRes.data);
      }

      // 2. Fetch Global Market Overview
      const gRes = await safeFetchJson<GlobalMarketData>('/api/stocks/global');
      if (gRes.ok && gRes.data) {
        setGlobalData(gRes.data);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching live stock market data:', err);
    } finally {
      setIsLoadingMarkets(false);
    }
  }, []);

  // Initial load and periodic polling (every 30 seconds)
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Handle open chart modal
  const handleOpenChartModal = (asset: StockAsset) => {
    setSelectedAssetForChart(asset);
    setIsChartModalOpen(true);
  };

  // Handle run AI analysis on asset
  const handleRunAiAnalysis = (asset: StockAsset) => {
    setSelectedAssetForAi(asset);
    setActiveTab('ai_predictions');
  };

  // Handle direct alert creation
  const handleCreateAlertFromAsset = (asset: StockAsset) => {
    setAlerts((prev) => [
      {
        id: `alert-${Date.now()}`,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        type: 'volume_spike',
        condition: 'above',
        targetValue: 120,
        description: `Pico de volumen superior al 120% en ${asset.name} (${asset.symbol.toUpperCase()})`,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setActiveTab('alerts');
    setToastMessage({
      title: 'Alerta Creada',
      body: `Monitoreando volumen institucional para ${asset.name}.`,
      type: 'success',
    });
  };

  // Handle create target alert with specific price and description
  const handleCreateTargetAlert = (asset: StockAsset, targetPrice: number, desc: string) => {
    setAlerts((prev) => [
      {
        id: `alert-tp-${Date.now()}`,
        assetSymbol: asset.symbol,
        assetName: asset.name,
        type: 'price_target',
        condition: 'above',
        targetValue: targetPrice,
        description: desc,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setActiveTab('alerts');
    setToastMessage({
      title: 'Alerta de Objetivo Creada',
      body: `Te notificaremos cuando ${asset.name} alcance $${targetPrice}.`,
      type: 'success',
    });
  };

  // Add Alert
  const handleAddAlert = (alertData: Omit<MarketAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: MarketAlert = {
      ...alertData,
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setToastMessage({
      title: 'Alerta Guardada',
      body: `Se ha activado el monitoreo para ${newAlert.assetName}.`,
      type: 'success',
    });
  };

  // Toggle Alert
  const handleToggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  // Delete Alert
  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Test Trigger Alert
  const handleTestTriggerAlert = (id: string) => {
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return;

    playAlertSound();
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, triggered: true } : a))
    );
    setToastMessage({
      title: `¡Alerta Disparada!: ${alert.assetName}`,
      body: alert.description,
      type: 'alert',
    });
  };

  // Add Portfolio Asset
  const handleAddPortfolioAsset = (newAsset: PortfolioAsset) => {
    setPortfolio((prev) => {
      const existsIndex = prev.findIndex((p) => p.symbol.toLowerCase() === newAsset.symbol.toLowerCase());
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = {
          ...updated[existsIndex],
          amount: updated[existsIndex].amount + newAsset.amount,
          lastSynced: new Date().toISOString(),
        };
        return updated;
      }
      return [newAsset, ...prev];
    });

    setToastMessage({
      title: 'Cartera Actualizada',
      body: `Se agregaron ${newAsset.amount} acciones de ${newAsset.symbol.toUpperCase()} a tu portafolio.`,
      type: 'success',
    });
  };

  // Remove Portfolio Asset
  const handleRemovePortfolioAsset = (id: string) => {
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
  };

  // Simple Broker Simulation Handlers & Calculations
  const EUR_TO_USD_RATE = 1.08;

  const handleOpenBrokerModal = (asset?: StockAsset) => {
    if (asset) {
      setSelectedBrokerAsset(asset);
    } else {
      setSelectedBrokerAsset(null);
    }
    setIsBrokerModalOpen(true);
  };

  const handleOpenTrade = ({
    asset,
    amountEur,
    type,
    takeProfitEur,
    takeProfitPct,
    takeProfitPrice,
    stopLossEur,
    stopLossPct,
    stopLossPrice,
    strategyTag,
  }: {
    asset: StockAsset;
    amountEur: number;
    type: 'BUY' | 'SELL';
    takeProfitEur?: number;
    takeProfitPct?: number;
    takeProfitPrice?: number;
    stopLossEur?: number;
    stopLossPct?: number;
    stopLossPrice?: number;
    strategyTag?: string;
  }) => {
    const entryPrice = Math.max(0.0001, asset.current_price);
    const shares = amountEur / entryPrice;

    const newTrade: SimulatedTrade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      image: asset.image,
      sector: asset.sector,
      type,
      investedEur: amountEur,
      investedAmountEur: amountEur,
      entryPriceEur: entryPrice,
      entryPriceUsd: entryPrice,
      shares: Number(shares.toFixed(6)),
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      takeProfitEur,
      takeProfitPct,
      takeProfitPrice,
      stopLossEur,
      stopLossPct,
      stopLossPrice,
      strategyTag: strategyTag || 'Operación Manual Simulada',
      exchangeRateEurUsd: 1.0,
    };

    setBrokerTrades((prev) => [newTrade, ...prev]);
    setToastMessage({
      title: 'Orden Ejecutada en Broker Simulado',
      body: `${type === 'BUY' ? 'Compradas' : 'Vendidas en corto'} ${shares.toFixed(3)} acc. de ${asset.symbol.toUpperCase()} a $${entryPrice.toFixed(2)} por ${amountEur.toLocaleString('es-ES')} €`,
      type: 'success',
    });
  };

  const handleCloseTrade = (tradeId: string) => {
    setBrokerTrades((prev) =>
      prev.map((t) => {
        if (t.id !== tradeId) return t;
        const metrics = calculateTradeMetrics(t, assets);

        return {
          ...t,
          status: 'CLOSED' as const,
          closedAt: new Date().toISOString(),
          exitPriceUsd: metrics.currentPrice,
          exitPriceEur: metrics.currentPrice,
          realizedPnlEur: metrics.pnlEur,
          realizedPnlPct: metrics.pnlPct,
          closeReason: metrics.tpReached ? 'take_profit' : metrics.slReached ? 'stop_loss' : 'manual',
        };
      })
    );

    setToastMessage({
      title: 'Posición Cerrada en Broker Simulado',
      body: 'La posición se ha liquidado a precio actual y se ha guardado en el historial con su balance consolidado.',
      type: 'success',
    });
  };

  const handleDeleteTrade = (tradeId: string) => {
    setBrokerTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setToastMessage({
      title: 'Operación Eliminada',
      body: 'La operación ha sido borrada de la memoria del simulador.',
      type: 'info',
    });
  };

  const handleResetTrades = () => {
    setBrokerTrades([]);
    setToastMessage({
      title: 'Simulador Reiniciado',
      body: 'Se han borrado todas las operaciones del broker simulado.',
      type: 'info',
    });
  };

  const openTrades = brokerTrades.filter((t) => t.status === 'OPEN');
  const openTradesCount = openTrades.length;
  const brokerSummary = calculatePortfolioSummary(brokerTrades, assets);
  const totalBrokerPnlEur = brokerSummary.totalPnlEur;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans antialiased w-full max-w-full overflow-x-hidden">
      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        globalData={globalData}
        isExpertMode={isExpertMode}
        setIsExpertMode={setIsExpertMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        alertsCount={alerts.filter((a) => a.enabled).length}
        isLoading={isLoadingMarkets}
        onRefresh={fetchMarketData}
        openEducationModal={() => setIsEducationModalOpen(true)}
        assets={assets}
        onOpenMasterDiagnostic={(asset) => {
          setSelectedMasterAsset(asset);
          setIsMasterModalOpen(true);
        }}
        onOpenBrokerModal={() => handleOpenBrokerModal()}
        onOpenAlpacaModal={() => setIsAlpacaModalOpen(true)}
        onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
        openTradesCount={openTradesCount}
        brokerPnlEur={totalBrokerPnlEur}
      />

      {/* Cloud Quota Status Notice (Circuit Breaker Protection) */}
      {isCloudQuotaExceeded && !isQuotaBannerDismissed && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="leading-snug">
                <strong className="text-white font-semibold">Cuota Diaria Gratuita de Firestore Alcanzada (20.000 ops):</strong> La sincronización en la nube se ha pausado preventivamente para proteger la aplicación. Todos tus datos, trades y bots siguen guardándose de forma segura en <span className="underline font-mono text-amber-300">almacenamiento local (localStorage)</span>. La cuota se reinicia automáticamente mañana.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <a
                href="https://console.firebase.google.com/project/silicon-beaker-gc9s2/firestore/databases/ai-studio-criptoalphav5pla-bf016290-1486-42bc-9800-67b386347b08/data?openUpgradeDialog=true"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-900/60 hover:bg-amber-900 px-2.5 py-1 rounded-lg border border-amber-500/30 transition cursor-pointer"
              >
                <span>Ver Cuota en Firebase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setIsQuotaBannerDismissed(true)}
                className="text-amber-400 hover:text-white p-1 rounded hover:bg-amber-900/40 transition cursor-pointer"
                title="Descartar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6 min-w-0 overflow-x-hidden">
        {/* Tab 1: Página Principal / Hub de Selección de Análisis */}
        {activeTab === 'home' && (
          <HomeHub
            assets={assets}
            globalData={globalData}
            onNavigateTo={setActiveTab}
            onOpenChartModal={handleOpenChartModal}
            onOpenBrokerModal={handleOpenBrokerModal}
            onOpenAlpacaModal={() => setIsAlpacaModalOpen(true)}
          />
        )}

        {/* Tab: Bot de Trading Autónomo Cuántico 24/7 & Broker Online */}
        {activeTab === 'quant_bot' && (
          <AutonomousBotHub
            assets={assets}
            trades={brokerTrades}
            onTradesUpdate={setBrokerTrades}
            onOpenAssetDiagnostic={(asset) => {
              setSelectedMasterAsset(asset);
              setIsMasterModalOpen(true);
            }}
            onOpenChartModal={handleOpenChartModal}
          />
        )}

        {/* Tab: Bot Especializado en Scalping de Alta Precisión (1M/5M) */}
        {activeTab === 'scalping_bot' && (
          <ScalpingBotHub
            assets={assets}
            trades={scalpingTrades}
            onTradesUpdate={setScalpingTrades}
            onOpenAssetDiagnostic={(asset) => {
              setSelectedMasterAsset(asset);
              setIsMasterModalOpen(true);
            }}
            onOpenChartModal={handleOpenChartModal}
          />
        )}

        {/* Tab 2: Acción del Día (Señal de Ignición & Entrada/Salida) */}
        {activeTab === 'crypto_of_the_day' && (
          <CryptoOfTheDay
            assets={assets}
            onOpenChartModal={handleOpenChartModal}
            onOpenAiAnalysis={handleRunAiAnalysis}
            onAddPortfolioAsset={handleAddPortfolioAsset}
            onCreateAlert={handleCreateTargetAlert}
            onOpenBrokerModal={handleOpenBrokerModal}
            isExpertMode={isExpertMode}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {/* Tab 3: Escáner de Oportunidades Alpha */}
        {activeTab === 'opportunities' && (
          <OpportunitiesScreener
            assets={assets}
            isLoading={isLoadingMarkets}
            onSelectAssetForAnalysis={handleRunAiAnalysis}
            onSelectAssetForChart={handleOpenChartModal}
            onCreateAlertForAsset={handleCreateAlertFromAsset}
            onOpenBrokerModal={handleOpenBrokerModal}
            onOpenMasterDiagnostic={(asset) => {
              setSelectedMasterAsset(asset);
              setIsMasterModalOpen(true);
            }}
            isExpertMode={isExpertMode}
            searchQuery={searchQuery}
          />
        )}

        {/* Tab: Escáner Multi-Temporal y Squeeze Momentum */}
        {activeTab === 'multi_timeframe' && (
          <MultiTimeframeScanner
            assets={assets}
            onOpenChartModal={handleOpenChartModal}
            onOpenAiAnalysis={handleRunAiAnalysis}
            onOpenBrokerModal={handleOpenBrokerModal}
            onOpenMasterDiagnostic={(asset) => {
              setSelectedMasterAsset(asset);
              setIsMasterModalOpen(true);
            }}
            isExpertMode={isExpertMode}
          />
        )}

        {/* Tab: Radar de Huella Institucional (Dark Pools & Unusual Options) */}
        {activeTab === 'institutional_flow' && (
          <InstitutionalFlowRadar
            assets={assets}
            onOpenChartModal={handleOpenChartModal}
            onCreateAlert={handleCreateTargetAlert}
            isExpertMode={isExpertMode}
          />
        )}

        {/* Tab: Backtesting Cuantitativo y Rendimiento Histórico */}
        {activeTab === 'backtesting' && (
          <BacktestingEngine
            assets={assets}
            initialAsset={selectedAssetForChart}
            onOpenChartModal={handleOpenChartModal}
            isExpertMode={isExpertMode}
          />
        )}

        {/* Tab 4: Diagnóstico e Inteligencia Predictiva IA */}
        {activeTab === 'ai_predictions' && (
          <AiPredictiveHub
            assets={assets}
            selectedAsset={selectedAssetForAi}
            onSelectAsset={setSelectedAssetForAi}
            isExpertMode={isExpertMode}
          />
        )}

        {/* Tab 5: Gestor de Alertas de Volumen y Volatilidad */}
        {activeTab === 'alerts' && (
          <AlertsManager
            assets={assets}
            alerts={alerts}
            onAddAlert={handleAddAlert}
            onToggleAlert={handleToggleAlert}
            onDeleteAlert={handleDeleteAlert}
            onTestTriggerAlert={handleTestTriggerAlert}
            isExpertMode={isExpertMode}
          />
        )}

        {/* Tab 6: Sincronización de Brokers y Cartera de Acciones */}
        {activeTab === 'portfolio' && (
          <PortfolioSync
            assets={assets}
            portfolio={portfolio}
            onAddPortfolioAsset={handleAddPortfolioAsset}
            onRemovePortfolioAsset={handleRemovePortfolioAsset}
            onRefreshPortfolio={fetchMarketData}
            isExpertMode={isExpertMode}
          />
        )}

        {/* Tab 7: Estudios Periódicos y Exportación PDF / Excel */}
        {activeTab === 'reports' && (
          <PeriodicalReports
            assets={assets}
            globalData={globalData}
            isExpertMode={isExpertMode}
          />
        )}
      </main>

      {/* Master 360° All-Studies Diagnostic Modal */}
      <MasterDiagnosticModal
        asset={selectedMasterAsset}
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        onOpenBacktest={(asset) => {
          setSelectedAssetForChart(asset);
          setActiveTab('backtesting');
        }}
        onOpenInstitutionalRadar={(asset) => {
          setSelectedAssetForChart(asset);
          setActiveTab('institutional_flow');
        }}
        onOpenMultiTimeframe={(asset) => {
          setSelectedAssetForChart(asset);
          setActiveTab('multi_timeframe');
        }}
        onCreateAlert={(asset, targetPrice, desc) => {
          handleCreateTargetAlert(asset, targetPrice, desc);
        }}
        onAddToPortfolio={(asset) => {
          handleAddPortfolioAsset({
            id: `port-${asset.symbol}-${Date.now()}`,
            symbol: asset.symbol,
            name: asset.name,
            amount: 10,
            buyPrice: asset.current_price,
            currentPrice: asset.current_price,
            source: 'broker_ibkr',
            lastSynced: new Date().toISOString(),
          });
        }}
        onOpenBrokerModal={(asset) => handleOpenBrokerModal(asset)}
        isExpertMode={isExpertMode}
      />

      {/* Technical Chart Detail Modal */}
      <AssetDetailModal
        asset={selectedAssetForChart}
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        onRunAiPrediction={(asset) => {
          handleRunAiAnalysis(asset);
        }}
        onCreateAlert={(asset) => {
          handleCreateAlertFromAsset(asset);
        }}
        onOpenBacktest={(asset) => {
          setSelectedAssetForChart(asset);
          setActiveTab('backtesting');
        }}
        onOpenInstitutionalRadar={(asset) => {
          setSelectedAssetForChart(asset);
          setActiveTab('institutional_flow');
        }}
        onOpenBrokerModal={(asset) => handleOpenBrokerModal(asset)}
        isExpertMode={isExpertMode}
      />

      {/* Simple Online Broker Simulator Modal */}
      <SimpleBrokerModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        selectedAsset={selectedBrokerAsset}
        onSelectAsset={(asset) => setSelectedBrokerAsset(asset)}
        assets={assets}
        trades={brokerTrades}
        onOpenTrade={handleOpenTrade}
        onCloseTrade={handleCloseTrade}
        onDeleteTrade={handleDeleteTrade}
        onResetTrades={handleResetTrades}
        onOpenChartModal={(asset) => handleOpenChartModal(asset)}
      />

      {/* Educational Guide Modal */}
      {isEducationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📚 Guía de Indicadores Bursátiles y Gestión de Riesgo</span>
              </h3>
              <button 
                onClick={() => setIsEducationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <strong className="text-emerald-400 block mb-0.5">Alpha Score (0 - 100):</strong>
                Puntuación matemática que combina RSI, cruces de medias EMA (20/50/200), anomalías de volumen institucional y múltiplos de valoración. Puntuaciones superiores a 75 indican fuerte probabilidad alcista.
              </div>
              <div>
                <strong className="text-teal-300 block mb-0.5">Ratio P/E (Price to Earnings):</strong>
                Compara el precio de la acción con las ganancias netas por acción. Permite saber si una empresa cotiza con prima de crecimiento o con descuento frente a su sector.
              </div>
              <div>
                <strong className="text-cyan-300 block mb-0.5">Volumen Anómalo / Flujo Institucional:</strong>
                Detecta compras masivas por parte de fondos de inversión cuando el volumen supera entre 1.3x y 2.5x la media móvil de 20 sesiones.
              </div>
              <div>
                <strong className="text-rose-400 block mb-0.5">Regla de Oro de Gestión de Riesgo:</strong>
                Nunca arriesgues más del 1-2% del capital total de tu cuenta en una sola operación. Coloca siempre tu orden de Stop Loss al entrar en el broker.
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setIsEducationModalOpen(false)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alpaca Real-Time Activity Summary & Portfolio Modal */}
      <AlpacaDashboardModal
        isOpen={isAlpacaModalOpen}
        onClose={() => setIsAlpacaModalOpen(false)}
        assets={assets}
        onTradeExecuted={fetchMarketData}
      />

      {/* Real-time Cloud Sync & Multi-Device Synchronization Modal */}
      <CloudSyncStatusModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        lastSyncTime={lastSyncTime}
        brokerTradesCount={brokerTrades.length}
        scalpingTradesCount={scalpingTrades.length}
        alertsCount={alerts.length}
        portfolioItemsCount={portfolio.length}
        onForceSync={handleForceSyncAll}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl transition animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-400">{toastMessage.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5">{toastMessage.body}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Professional Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">StockAlpha Pro Terminal</span>
            <span>•</span>
            <span>Datos en Vivo de Wall Street, S&amp;P 500, NASDAQ &amp; SEC EDGAR</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Actualización en vivo: {lastUpdated.toLocaleTimeString('es-ES')} • Modelos: Gemini 3.7 Flash Cuantitativo
          </div>
        </div>
      </footer>
    </div>
  );
}
