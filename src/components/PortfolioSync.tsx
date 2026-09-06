import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  RefreshCw, 
  Trash2, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Cpu, 
  Link, 
  CheckCircle, 
  AlertCircle,
  Building,
  Coins,
  Wallet
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CryptoAsset, PortfolioAsset } from '../types';
import { syncCryptoWalletOrExchange } from '../utils/walletSync';
import { formatCurrency, formatPercentage, formatCompactNumber } from '../utils/formatters';
import { getCryptoLogoUrl, handleCryptoImageError } from '../utils/cryptoLogos';

interface PortfolioSyncProps {
  assets: CryptoAsset[];
  portfolio: PortfolioAsset[];
  onAddPortfolioAsset: (asset: PortfolioAsset) => void;
  onRemovePortfolioAsset: (id: string) => void;
  onRefreshPortfolio: () => void;
  isExpertMode: boolean;
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1', '#14B8A6', '#F43F5E'];

export const PortfolioSync: React.FC<PortfolioSyncProps> = ({
  assets,
  portfolio,
  onAddPortfolioAsset,
  onRemovePortfolioAsset,
  onRefreshPortfolio,
  isExpertMode,
}) => {
  const [syncMode, setSyncMode] = useState<'wallet' | 'manual'>('wallet');
  
  // Wallet / Exchange Form state
  const [selectedProvider, setSelectedProvider] = useState<string>('phantom');
  const [accountIdentifier, setAccountIdentifier] = useState<string>('83wE...9xLm (Demo Solana Address)');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Manual Asset Form state
  const [manualSymbol, setManualSymbol] = useState<string>('btc');
  const [manualAmount, setManualAmount] = useState<string>('0.5');
  const [manualBuyPrice, setManualBuyPrice] = useState<string>('84500');

  // Compute Live Portfolio Metrics with current market prices
  const enrichedPortfolio = useMemo(() => {
    return portfolio.map((item) => {
      const liveAsset = assets.find((a) => a.symbol.toLowerCase() === item.symbol.toLowerCase());
      const currentPrice = liveAsset ? liveAsset.current_price : item.currentPrice || item.buyPrice;
      const totalValue = item.amount * currentPrice;
      const initialCost = item.amount * item.buyPrice;
      const pnlValue = totalValue - initialCost;
      const pnlPercentage = initialCost > 0 ? (pnlValue / initialCost) * 100 : 0;

      return {
        ...item,
        currentPrice,
        totalValue,
        initialCost,
        pnlValue,
        pnlPercentage,
        image: liveAsset?.image,
        sector: liveAsset?.sector || 'Cripto',
      };
    });
  }, [portfolio, assets]);

  const totalPortfolioValue = enrichedPortfolio.reduce((acc, i) => acc + i.totalValue, 0);
  const totalPortfolioCost = enrichedPortfolio.reduce((acc, i) => acc + i.initialCost, 0);
  const totalPnl = totalPortfolioValue - totalPortfolioCost;
  const totalPnlPct = totalPortfolioCost > 0 ? (totalPnl / totalPortfolioCost) * 100 : 0;

  // Chart Allocation Data
  const pieData = useMemo(() => {
    if (enrichedPortfolio.length === 0) {
      return [{ name: 'Sin Activos', value: 1 }];
    }
    return enrichedPortfolio.map((item) => ({
      name: item.name,
      symbol: item.symbol.toUpperCase(),
      value: Number(item.totalValue.toFixed(2)),
    }));
  }, [enrichedPortfolio]);

  // Handle Wallet / Exchange Sync Submit
  const handleWalletSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountIdentifier.trim()) return;

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const res = await syncCryptoWalletOrExchange(selectedProvider, accountIdentifier);
      if (res.success) {
        res.assets.forEach((ast, idx) => {
          const liveAsset = assets.find((a) => a.symbol.toLowerCase() === ast.symbol.toLowerCase());
          const currentPrice = liveAsset ? liveAsset.current_price : ast.buyPrice;

          onAddPortfolioAsset({
            id: `wallet-${selectedProvider}-${idx}-${Date.now()}`,
            symbol: ast.symbol,
            name: ast.name,
            amount: ast.amount,
            buyPrice: ast.buyPrice,
            currentPrice,
            source: ast.source as any,
            lastSynced: new Date().toISOString(),
          });
        });

        setSyncStatus({
          success: true,
          message: res.message || 'Sincronización completada con éxito.',
        });
      }
    } catch (err: any) {
      setSyncStatus({ success: false, message: err.message || 'Error al conectar con la wallet o exchange.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Manual Add Submit
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const liveAsset = assets.find((a) => a.symbol.toLowerCase() === manualSymbol.toLowerCase());
    const amt = parseFloat(manualAmount);
    const buy = parseFloat(manualBuyPrice);

    if (isNaN(amt) || isNaN(buy) || amt <= 0 || buy <= 0) return;

    onAddPortfolioAsset({
      id: `manual-${manualSymbol}-${Date.now()}`,
      symbol: manualSymbol.toLowerCase(),
      name: liveAsset?.name || manualSymbol.toUpperCase(),
      amount: amt,
      buyPrice: buy,
      currentPrice: liveAsset ? liveAsset.current_price : buy,
      source: 'manual',
      lastSynced: new Date().toISOString(),
    });

    setManualAmount('1');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Sincronización de Wallets Web3, Exchanges &amp; Cartera Cripto
            </h3>
            <p className="text-xs text-slate-400">
              Conexión en tiempo real para Phantom, MetaMask, Coinbase, Binance, Bybit, Ledger, OKX, Solana y EVM
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshPortfolio}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualizar Cotizaciones en Vivo</span>
        </button>
      </div>

      {/* Portfolio Performance Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400 block font-medium">Valor Total de la Cartera</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(totalPortfolioValue)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            Costo base invertido: {formatCurrency(totalPortfolioCost)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400 block font-medium">Ganancia / Pérdida Neta (P&amp;L)</span>
          <div className={`text-2xl font-black font-mono mt-1 flex items-center gap-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnl >= 0 ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
            {formatCurrency(totalPnl)}
          </div>
          <span className={`text-[11px] font-bold font-mono ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}% de retorno total
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400 block font-medium">Criptoactivos en Custodia</span>
          <div className="text-2xl font-black text-cyan-300 font-mono mt-1">
            {enrichedPortfolio.length} Tokens
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Diversificación multicadena activa
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400 block font-medium">Seguridad &amp; Conexión</span>
          <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <span>Encriptación Web3 &amp; Read-Only</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Sin custodia ni permisos de retiro
          </span>
        </div>
      </div>

      {/* Main Section: Left Connection Forms / Right Allocation & Assets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Add via Wallet or Manual (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white">Vincular Wallets o Exchanges</span>
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
              <button
                onClick={() => setSyncMode('wallet')}
                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                  syncMode === 'wallet' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Web3 / Exchange API
              </button>
              <button
                onClick={() => setSyncMode('manual')}
                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                  syncMode === 'manual' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {syncMode === 'wallet' ? (
            <form onSubmit={handleWalletSync} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Seleccionar Wallet o Exchange:</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <optgroup label="Wallets Web3 &amp; Hardware">
                    <option value="phantom">Phantom Wallet (Solana / Multi-Chain)</option>
                    <option value="metamask">MetaMask (Ethereum / Arbitrum / Base)</option>
                    <option value="coinbase_wallet">Coinbase Wallet Web3</option>
                    <option value="ledger">Ledger Hardware Cold Storage</option>
                    <option value="sui_wallet">Sui Wallet</option>
                    <option value="keplr">Keplr (Cosmos Hub / IBC)</option>
                    <option value="address_sol">Dirección Pública Solana (Base58)</option>
                    <option value="address_evm">Dirección Pública EVM (0x...)</option>
                    <option value="address_btc">Dirección Pública Bitcoin (bc1...)</option>
                  </optgroup>
                  <optgroup label="Exchanges Centralizados (API Read-Only)">
                    <option value="binance">Binance Spot / Futuros</option>
                    <option value="bybit">Bybit Unified Account</option>
                    <option value="coinbase">Coinbase Advanced</option>
                    <option value="okx">OKX Global</option>
                    <option value="kraken">Kraken Exchange</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Dirección Pública / API Key (Read-Only):</label>
                <input
                  type="text"
                  value={accountIdentifier}
                  onChange={(e) => setAccountIdentifier(e.target.value)}
                  placeholder="Ej. 0x71C... o 83wE... o API Key..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-2.5 text-xs font-bold text-white hover:bg-cyan-500 transition shadow-lg shadow-cyan-600/30 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Conectando con Blockchain...' : 'Sincronizar Balance On-Chain'}</span>
              </button>

              {syncStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  syncStatus.success 
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' 
                    : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
                }`}>
                  {syncStatus.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{syncStatus.message}</span>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleManualAdd} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Criptomoneda / Token:</label>
                <select
                  value={manualSymbol}
                  onChange={(e) => {
                    setManualSymbol(e.target.value);
                    const sel = assets.find((a) => a.symbol === e.target.value);
                    if (sel) setManualBuyPrice(sel.current_price.toString());
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-bold text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.symbol}>
                      {a.symbol.toUpperCase()} - {a.name} ({formatCurrency(a.current_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Cantidad de Tokens:</label>
                  <input
                    type="number"
                    step="any"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Precio Compra (USD):</label>
                  <input
                    type="number"
                    step="any"
                    value={manualBuyPrice}
                    onChange={(e) => setManualBuyPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-2.5 text-xs font-bold text-white hover:bg-cyan-500 transition shadow-lg shadow-cyan-600/30 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Añadir Token a Cartera</span>
              </button>
            </form>
          )}

          {/* Allocation Breakdown Chart */}
          <div className="pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block mb-2">Distribución de Cartera:</span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {(pieData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`$${value}`, 'Valor']}
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Assets Table (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white">Posiciones Activas en Cartera</span>
            <span className="text-xs text-slate-400 font-mono">Actualizado con feeds On-Chain</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-2">Criptoactivo</th>
                  <th className="pb-2 text-right">Cantidad</th>
                  <th className="pb-2 text-right">P. Compra</th>
                  <th className="pb-2 text-right">P. Actual</th>
                  <th className="pb-2 text-right">Valor Total</th>
                  <th className="pb-2 text-right">P&amp;L</th>
                  <th className="pb-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(enrichedPortfolio || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 pr-2 font-sans font-bold text-white">
                      <div className="flex items-center gap-2">
                        <img 
                          src={getCryptoLogoUrl(item.symbol)} 
                          alt={item.name} 
                          onError={(e) => handleCryptoImageError(e, item.symbol)}
                          referrerPolicy="no-referrer"
                          className="h-6 w-6 rounded-lg object-contain p-0.5 border border-slate-700 bg-slate-900" 
                        />
                        <div>
                          <div className="font-bold">{item.symbol.toUpperCase()}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.sector}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-slate-200">{item.amount}</td>
                    <td className="py-2.5 text-right text-slate-400">{formatCurrency(item.buyPrice)}</td>
                    <td className="py-2.5 text-right text-slate-100 font-bold">{formatCurrency(item.currentPrice)}</td>
                    <td className="py-2.5 text-right text-white font-bold">{formatCurrency(item.totalValue)}</td>
                    <td className="py-2.5 text-right">
                      <span className={item.pnlValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.pnlValue >= 0 ? '+' : ''}{formatCurrency(item.pnlValue)}
                        <span className="text-[10px] block">
                          ({item.pnlPercentage >= 0 ? '+' : ''}{item.pnlPercentage.toFixed(1)}%)
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => onRemovePortfolioAsset(item.id)}
                        className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar posición"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
