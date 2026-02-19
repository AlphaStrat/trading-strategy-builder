import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Play, Loader2, AlertCircle, Clock, Activity, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import BacktestResults from './BacktestResults';

const ENGINE_URL = 'http://127.0.0.1:8020';

const PHASE_ICONS = {
    init: '🔧',
    converting: '🔄',
    downloading: '📡',
    processing: '📊',
    indicators: '📈',
    risk: '🛡️',
    backtesting: '⚡',
    results: '📋',
    completed: '✅',
    error: '❌',
};

const BacktestPanel = ({ nodes, edges, strategyName }) => {
    const [symbols, setSymbols] = useState('AAPL');
    const [years, setYears] = useState(2);
    const [startingCash, setStartingCash] = useState(10000);
    const [slippageBps, setSlippageBps] = useState(5);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null); // { phase, progress, message, elapsed }
    const pollRef = useRef(null);

    // Poll for backtest progress
    useEffect(() => {
        if (!jobId || !isRunning) return;

        const poll = async () => {
            try {
                const res = await axios.get(`${ENGINE_URL}/api/backtest/progress/${jobId}`, { timeout: 5000 });
                const data = res.data;
                setProgress(data);

                if (data.status === 'completed' && data.result) {
                    setResults(data.result);
                    setShowResults(true);
                    setIsRunning(false);
                    setJobId(null);
                    clearInterval(pollRef.current);
                } else if (data.status === 'error') {
                    setError(data.message || 'Backtest failed');
                    setIsRunning(false);
                    setJobId(null);
                    clearInterval(pollRef.current);
                }
            } catch {
                // Keep polling on transient errors
            }
        };

        poll(); // immediate first poll
        pollRef.current = setInterval(poll, 1000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [jobId, isRunning]);

    const runBacktest = async () => {
        setIsRunning(true);
        setError('');
        setResults(null);
        setProgress(null);
        setJobId(null);

        const strategy = {
            name: strategyName || 'My Strategy',
            nodes: nodes.map(node => {
                let nodeName = node.data.label;
                if (!nodeName) {
                    if (node.type === 'logicNode') nodeName = 'Logic';
                    else if (node.type === 'actionNode') nodeName = `Action ${node.data.actionType}`;
                    else nodeName = 'Node';
                }

                let nodeType = node.type || 'indicator';
                if (node.type === 'indicatorNode' || node.type === 'default' || !node.type) nodeType = 'indicator';
                if (node.type === 'logicNode') nodeType = 'logic';
                if (node.type === 'actionNode') nodeType = 'action';

                const params = { ...(node.data || {}), ...(node.data.parameters || {}) };
                delete params.onParameterChange;
                delete params.label;

                return {
                    id: node.id,
                    type: nodeType,
                    name: nodeName,
                    parameters: params,
                    position: node.position || { x: 0, y: 0 },
                };
            }),
            connections: edges.map(edge => ({
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
            })),
        };

        const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

        try {
            const response = await axios.post(`${ENGINE_URL}/api/backtest`, {
                strategy,
                symbols: symbolList,
                years: parseInt(years),
                starting_cash: parseFloat(startingCash),
                slippage_bps: parseFloat(slippageBps),
                fee_bps: 0,
                interval: '1d',
            }, { timeout: 10000 }); // Short timeout - just needs to launch

            if (response.data.job_id) {
                setJobId(response.data.job_id);
                // Polling will now take over via useEffect
            }
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Unknown error';
            setError(msg);
            setIsRunning(false);
        }
    };

    const hasStrategyNodes = nodes.some(n => 
        n.type === 'indicatorNode' || n.type === 'logicNode' || n.type === 'actionNode'
    );
    const formatElapsed = (secs) => {
        if (!secs) return '0s';
        if (secs < 60) return `${Math.round(secs)}s`;
        return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Config section */}
            <div className="p-4 space-y-3 border-b border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={18} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Backtest Engine</h3>
                </div>

                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Symbols (comma-separated)</label>
                    <input
                        type="text"
                        value={symbols}
                        onChange={(e) => setSymbols(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        placeholder="AAPL, MSFT, GOOGL"
                        disabled={isRunning}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Years</label>
                        <input
                            type="number"
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                            min={1} max={10}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                            disabled={isRunning}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Capital $</label>
                        <input
                            type="number"
                            value={startingCash}
                            onChange={(e) => setStartingCash(e.target.value)}
                            min={100}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                            disabled={isRunning}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Slip (bps)</label>
                        <input
                            type="number"
                            value={slippageBps}
                            onChange={(e) => setSlippageBps(e.target.value)}
                            min={0}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                            disabled={isRunning}
                        />
                    </div>
                </div>

                {!hasStrategyNodes && !isRunning && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-300">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>No strategy nodes in graph. A default <strong>RSI(14)</strong> strategy will be used (buy &lt; 30, sell &gt; 70).</span>
                    </div>
                )}

                <button
                    onClick={runBacktest}
                    disabled={isRunning}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-sm transition-all shadow-lg active:scale-[0.98] disabled:cursor-not-allowed ${
                        isRunning
                            ? 'bg-amber-600 shadow-amber-500/20 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 text-white disabled:opacity-50'
                    }`}
                >
                    {isRunning ? (
                        <>
                            <Activity size={16} className="animate-pulse" />
                            Backtest Running...
                        </>
                    ) : (
                        <>
                            <Play size={16} />
                            Run Backtest
                        </>
                    )}
                </button>

                {/* Progress bar + status */}
                {isRunning && progress && (
                    <div className="space-y-2 p-3 bg-slate-800/70 rounded border border-slate-700">
                        {/* Progress bar */}
                        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-cyan-500 to-emerald-500"
                                style={{ width: `${Math.max(progress.progress, 2)}%` }}
                            />
                        </div>

                        {/* Status line */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm">{PHASE_ICONS[progress.phase] || '⏳'}</span>
                                <span className="text-[11px] text-slate-300 font-medium">{progress.message}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">{progress.progress}%</span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <Clock size={10} />
                                    {formatElapsed(progress.elapsed)}
                                </div>
                            </div>
                        </div>

                        {/* Phase dots */}
                        <div className="flex gap-1 justify-center pt-1">
                            {['converting', 'downloading', 'processing', 'indicators', 'risk', 'backtesting', 'results'].map((phase) => {
                                const phaseOrder = ['converting', 'downloading', 'processing', 'indicators', 'risk', 'backtesting', 'results'];
                                const currentIdx = phaseOrder.indexOf(progress.phase);
                                const thisIdx = phaseOrder.indexOf(phase);
                                const isDone = thisIdx < currentIdx;
                                const isCurrent = thisIdx === currentIdx;
                                return (
                                    <div
                                        key={phase}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                            isDone ? 'bg-emerald-500' :
                                            isCurrent ? 'bg-cyan-400 animate-pulse scale-125' :
                                            'bg-slate-700'
                                        }`}
                                        title={phase}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Completed banner */}
                {!isRunning && results && progress?.status === 'completed' && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400">
                        <CheckCircle2 size={14} />
                        <span>{progress.message}</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Results section */}
            <div className="flex-1 overflow-auto">
                {results ? (
                    <BacktestResults results={results} />
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 italic text-xs p-4 text-center">
                        Configure your strategy on the canvas, then run a backtest to see results here.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BacktestPanel;
