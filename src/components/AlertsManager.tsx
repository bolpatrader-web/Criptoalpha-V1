import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Volume2, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Sparkles,
  Zap,
  Target
} from 'lucide-react';
import { StockAsset, MarketAlert } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AlertsManagerProps {
  assets: StockAsset[];
  alerts: MarketAlert[];
  onAddAlert: (alert: Omit<MarketAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onTestTriggerAlert: (id: string) => void;
  isExpertMode: boolean;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({
  assets,
  alerts,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  onTestTriggerAlert,
  isExpertMode,
}) => {
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>(assets[0]?.symbol || 'nvda');
  const [alertType, setAlertType] = useState<'volume_spike' | 'rsi_extreme' | 'price_target' | 'volatility_breakout'>('volume_spike');
  const [targetValue, setTargetValue] = useState<string>('120');
  const [condition, setCondition] = useState<'above' | 'below' | 'cross' | 'spike'>('spike');
  const [customDesc, setCustomDesc] = useState<string>('');

  const selectedStock = assets.find((a) => a.symbol.toLowerCase() === selectedStockSymbol.toLowerCase()) || assets[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    const val = parseFloat(targetValue) || 100;
    let description = customDesc.trim();

    if (!description) {
      if (alertType === 'volume_spike') {
        description = `Pico de volumen superior al ${val}% de la media de 20 sesiones en ${selectedStock.name}.`;
      } else if (alertType === 'rsi_extreme') {
        description = `Rebote técnico: RSI ${condition === 'below' ? 'por debajo' : 'por encima'} de ${val} en ${selectedStock.name}.`;
      } else if (alertType === 'price_target') {
        description = `Precio objetivo alcanzado: ${condition === 'above' ? '≥' : '≤'} $${val} en ${selectedStock.name}.`;
      } else {
        description = `Ruptura de volatilidad (ATR breakout) en ${selectedStock.name}.`;
      }
    }

    onAddAlert({
      assetSymbol: selectedStock.symbol,
      assetName: selectedStock.name,
      type: alertType,
      condition: condition,
      targetValue: val,
      description,
      enabled: true,
    });

    setCustomDesc('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Gestor de Alertas de Volumen &amp; Volatilidad Bursátil
            </h3>
            <p className="text-xs text-slate-400">
              Monitoreo continuo de flujos institucionales y osciladores técnicos con avisos audibles
            </p>
          </div>
        </div>

        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-300">
          {alerts.filter((a) => a.enabled).length} Alertas Activas
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Create New Alert */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Plus className="h-4 w-4 text-emerald-400" />
            <span>Configurar Nueva Alerta Cuantitativa</span>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            {/* Asset Selection */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">Acción Bursátil:</label>
              <select
                value={selectedStockSymbol}
                onChange={(e) => setSelectedStockSymbol(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-amber-500 focus:outline-none"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.symbol}>
                    {a.symbol.toUpperCase()} - {a.name} (${a.current_price})
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Type */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">Tipo de Gatillo / Indicador:</label>
              <select
                value={alertType}
                onChange={(e) => {
                  const t = e.target.value as any;
                  setAlertType(t);
                  if (t === 'volume_spike') {
                    setTargetValue('120');
                    setCondition('spike');
                  } else if (t === 'rsi_extreme') {
                    setTargetValue('30');
                    setCondition('below');
                  } else if (t === 'price_target') {
                    setTargetValue(selectedStock ? selectedStock.current_price.toString() : '150');
                    setCondition('above');
                  }
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="volume_spike">Pico de Volumen Institucional (&gt; % Media)</option>
                <option value="rsi_extreme">Extremo RSI (Sobreventa o Sobrecompra)</option>
                <option value="price_target">Precio Objetivo / Nivel de Ruptura (USD)</option>
                <option value="volatility_breakout">Ruptura de Rango de Volatilidad ATR</option>
              </select>
            </div>

            {/* Target Value & Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Condición:</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="above">Por Encima de (≥)</option>
                  <option value="below">Por Debajo de (≤)</option>
                  <option value="spike">Pico Atípico</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Valor Umbral:</label>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono font-bold text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Custom Note */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">Nota o Descripción (Opcional):</label>
              <input
                type="text"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Ej. Revisar orden límite en broker si entra volumen"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-500 transition shadow-lg shadow-amber-600/30"
            >
              <Plus className="h-4 w-4" />
              <span>Guardar Alerta y Monitorear</span>
            </button>
          </form>
        </div>

        {/* Right List: Active Alerts */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-bold text-white">Alertas Programadas ({alerts.length})</span>
            <span className="text-xs text-slate-400">Sonido de alarma integrado</span>
          </div>

          {alerts.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs">No tienes alertas configuradas en este momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 transition ${
                    al.enabled
                      ? 'border-slate-700 bg-slate-950/80'
                      : 'border-slate-800/60 bg-slate-950/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleAlert(al.id)}
                      className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                        al.enabled
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {al.enabled ? '✓' : '—'}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">
                          {al.assetName} ({al.assetSymbol.toUpperCase()})
                        </span>
                        <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] px-1.5 font-mono">
                          {al.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{al.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTestTriggerAlert(al.id)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-1"
                      title="Probar sonido y notificación"
                    >
                      <Volume2 className="h-3 w-3 text-amber-400" />
                      <span>Probar</span>
                    </button>
                    <button
                      onClick={() => onDeleteAlert(al.id)}
                      className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-1 text-rose-400 hover:bg-rose-900 transition"
                      title="Eliminar Alerta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
