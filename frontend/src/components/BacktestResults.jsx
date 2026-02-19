import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

const MetricCard = ({ label, value, suffix = '', color = 'slate', icon: Icon }) => {
    const colorMap = {
        green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        slate: 'text-slate-300 bg-slate-800 border-slate-700',
    };

    return (
        <div className={`p-2 rounded border ${colorMap[color]} text-center`}>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">{label}</div>
            <div className="text-sm font-bold flex items-center justify-center gap-1">
                {Icon && <Icon size={12} />}
                {value}{suffix}
            </div>
        </div>
    );
};

const MiniEquityChart = ({ data }) => {
    if (!data || data.length < 2) return null;

    const values = data.map(d => d.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 100;
    const height = 40;
    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const finalReturn = ((values[values.length - 1] / values[0]) - 1) * 100;
    const lineColor = finalReturn >= 0 ? '#10b981' : '#ef4444';

    return (
        <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Equity Curve</span>
                <span className={`text-xs font-bold ${finalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {finalReturn >= 0 ? '+' : ''}{finalReturn.toFixed(2)}%
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#334155" strokeWidth="0.3" />
                <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#334155" strokeWidth="0.3" />
                <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#334155" strokeWidth="0.3" />
                {/* Equity line */}
                <polyline
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="1"
                    points={points}
                />
                {/* Gradient fill */}
                <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon
                    fill="url(#eqGrad)"
                    points={`0,${height} ${points} ${width},${height}`}
                />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                <span>${values[0]?.toFixed(0)}</span>
                <span>${values[values.length - 1]?.toFixed(0)}</span>
            </div>
        </div>
    );
};


const BacktestResults = ({ results }) => {
    const [showTrades, setShowTrades] = useState(false);

    const metrics = results.metrics || {};
    const equityCurve = results.equity_curve || [];
    const trades = results.trades || [];
    const usedDefault = results.used_default_strategy;

    const totalReturn = metrics.total_return ?? 0;
    const maxDrawdown = metrics.max_drawdown ?? 0;
    const sharpe = metrics.sharpe_approx ?? metrics.sharpe_ratio ?? 0;
    const startingEq = metrics.starting_equity ?? 10000;
    const endingEq = metrics.ending_equity ?? 10000;

    // Downsample equity curve for the chart (max 200 points)
    const chartData = useMemo(() => {
        if (equityCurve.length <= 200) return equityCurve;
        const step = Math.ceil(equityCurve.length / 200);
        return equityCurve.filter((_, i) => i % step === 0 || i === equityCurve.length - 1);
    }, [equityCurve]);

    return (
        <div className="p-3 space-y-3">
            {usedDefault && (
                <div className="flex items-start gap-2 p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[11px] text-cyan-300">
                    <Activity size={14} className="mt-0.5 shrink-0" />
                    <span>Results from default <strong>RSI(14)</strong> strategy (buy &lt; 30, sell &gt; 70). Build a custom strategy graph for personalized results.</span>
                </div>
            )}
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2">
                <MetricCard
                    label="Total Return"
                    value={(totalReturn * 100).toFixed(2)}
                    suffix="%"
                    color={totalReturn >= 0 ? 'green' : 'red'}
                    icon={totalReturn >= 0 ? TrendingUp : TrendingDown}
                />
                <MetricCard
                    label="Max Drawdown"
                    value={(maxDrawdown * 100).toFixed(2)}
                    suffix="%"
                    color="red"
                    icon={TrendingDown}
                />
                <MetricCard
                    label="Sharpe Ratio"
                    value={sharpe.toFixed(3)}
                    color={sharpe > 1 ? 'green' : sharpe > 0 ? 'yellow' : 'red'}
                    icon={Activity}
                />
                <MetricCard
                    label="Final Value"
                    value={`$${endingEq.toFixed(0)}`}
                    color="blue"
                    icon={DollarSign}
                />
            </div>

            {/* Equity Curve Chart */}
            <MiniEquityChart data={chartData} />

            {/* Additional metrics */}
            <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center p-1.5 bg-slate-800/50 rounded">
                    <div className="text-[8px] text-slate-500 uppercase">Start</div>
                    <div className="text-[11px] font-bold text-slate-300">${startingEq.toFixed(0)}</div>
                </div>
                <div className="text-center p-1.5 bg-slate-800/50 rounded">
                    <div className="text-[8px] text-slate-500 uppercase">End</div>
                    <div className="text-[11px] font-bold text-slate-300">${endingEq.toFixed(0)}</div>
                </div>
                <div className="text-center p-1.5 bg-slate-800/50 rounded">
                    <div className="text-[8px] text-slate-500 uppercase">Trades</div>
                    <div className="text-[11px] font-bold text-slate-300">{results.total_trades || trades.length}</div>
                </div>
            </div>

            {/* Trade Log */}
            {trades.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowTrades(!showTrades)}
                        className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
                    >
                        <span className="flex items-center gap-1">
                            <BarChart2 size={12} />
                            Trade Log ({trades.length})
                        </span>
                        {showTrades ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showTrades && (
                        <div className="mt-2 max-h-60 overflow-auto rounded border border-slate-800">
                            <table className="w-full text-[10px]">
                                <thead className="bg-slate-800 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-1 text-left text-slate-500">Date</th>
                                        <th className="px-2 py-1 text-left text-slate-500">Symbol</th>
                                        <th className="px-2 py-1 text-left text-slate-500">Action</th>
                                        <th className="px-2 py-1 text-right text-slate-500">Qty</th>
                                        <th className="px-2 py-1 text-right text-slate-500">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.slice(-100).map((trade, i) => {
                                        const action = trade.action || '';
                                        const isBuy = action.includes('buy') || action === 'enter_long';
                                        const isSell = action.includes('sell') || action.includes('close') || action.includes('short');
                                        return (
                                            <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                                                <td className="px-2 py-1 text-slate-400">{(trade.ts || '').split(' ')[0]}</td>
                                                <td className="px-2 py-1 text-slate-300 font-medium">{trade.symbol}</td>
                                                <td className={`px-2 py-1 font-bold ${isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-slate-400'}`}>
                                                    {action.toUpperCase()}
                                                </td>
                                                <td className="px-2 py-1 text-right text-slate-300">{trade.qty}</td>
                                                <td className="px-2 py-1 text-right text-slate-300">${parseFloat(trade.price || 0).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BacktestResults;
