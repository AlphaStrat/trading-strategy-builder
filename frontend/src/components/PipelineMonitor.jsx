import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Wifi, WifiOff, Server, Shield, ShieldOff, Radio, CircleDot, RefreshCw, ChevronDown, Terminal, Zap, Play, Square, LogIn, Power, Loader2, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const ENGINE_URL = 'http://127.0.0.1:8020';

const PHASE_LABELS = {
  idle: { label: 'IDLE', color: 'text-slate-400', dot: 'bg-slate-400' },
  starting: { label: 'STARTING', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  resolving: { label: 'RESOLVING CONIDS', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  warmup: { label: 'SNAPSHOT WARMUP', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  fetching: { label: 'FETCHING DATA', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  processing: { label: 'PROCESSING', color: 'text-blue-400', dot: 'bg-blue-400' },
  fitting: { label: 'MODEL FITTING', color: 'text-purple-400', dot: 'bg-purple-400' },
  risk: { label: 'RISK EVALUATION', color: 'text-orange-400', dot: 'bg-orange-400' },
  executing: { label: 'EXECUTING ORDERS', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  running: { label: 'RUNNING', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  unknown: { label: 'UNKNOWN', color: 'text-slate-500', dot: 'bg-slate-500' },
};

const StatusDot = ({ active, color }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${active ? color || 'bg-emerald-400' : 'bg-red-400'} ${active ? 'animate-pulse' : ''}`} />
);

const ServiceRow = ({ label, running, pid, uptime, icon: Icon, extra }) => (
  <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-800/50">
    <div className="flex items-center gap-2">
      <Icon size={13} className={running ? 'text-emerald-400' : 'text-red-400'} />
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {extra && <span className="text-[10px] text-slate-500">{extra}</span>}
      {pid && <span className="text-[10px] text-slate-600 font-mono">pid:{pid}</span>}
      {uptime && <span className="text-[10px] text-slate-500">{uptime}</span>}
      <StatusDot active={running} />
    </div>
  </div>
);

const LogLine = ({ entry }) => {
  const levelColors = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    debug: 'text-slate-600',
    info: 'text-slate-400',
  };
  return (
    <div className={`text-[11px] font-mono leading-relaxed ${levelColors[entry.level] || 'text-slate-400'} whitespace-pre-wrap break-all`}>
      {entry.text}
    </div>
  );
};

const PipelineMonitor = () => {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logSource, setLogSource] = useState('pipeline');
  const [runs, setRuns] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showRuns, setShowRuns] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'gateway-start' | 'gateway-stop' | 'login' | 'pipeline-start' | 'pipeline-stop'
  const [actionMsg, setActionMsg] = useState(null); // { type: 'success'|'error', text: '' }
  const [gatewayJobId, setGatewayJobId] = useState(null);
  const [gatewayStartMsg, setGatewayStartMsg] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const logEndRef = useRef(null);
  const intervalRef = useRef(null);
  const gatewayPollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${ENGINE_URL}/api/status`, { timeout: 5000 });
      setStatus(res.data);
      setLastUpdate(new Date());
    } catch {
      // Keep stale data
    }
  }, []);

  const fetchLogs = useCallback(async (source) => {
    try {
      setLoading(true);
      const res = await axios.get(`${ENGINE_URL}/api/logs`, {
        params: { lines: 200, source: source || logSource },
        timeout: 5000,
      });
      setLogs(res.data.lines || []);
    } catch {
      // Keep stale
    } finally {
      setLoading(false);
    }
  }, [logSource]);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await axios.get(`${ENGINE_URL}/api/logs/runs`, { timeout: 5000 });
      setRuns(res.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await axios.get(`${ENGINE_URL}/api/configs`, { timeout: 5000 });
      setConfigs(res.data || []);
    } catch {
      // ignore
    }
  }, []);

  const showActionResult = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 6000);
  };

  const handleAction = async (action) => {
    setActionLoading(action);
    setActionMsg(null);
    try {
      let res;
      switch (action) {
        case 'gateway-start':
          res = await axios.post(`${ENGINE_URL}/api/gateway/start`, {}, { timeout: 15000 });
          if (res?.data?.status === 'launched' && res.data.job_id) {
            // Non-blocking: start polling for gateway job completion
            setGatewayJobId(res.data.job_id);
            setGatewayStartMsg('Starting gateway...');
            showActionResult('success', 'Gateway launch initiated');
            // Start polling
            if (gatewayPollRef.current) clearInterval(gatewayPollRef.current);
            gatewayPollRef.current = setInterval(async () => {
              try {
                const poll = await axios.get(`${ENGINE_URL}/api/gateway/job/${res.data.job_id}`, { timeout: 5000 });
                const d = poll.data;
                if (d.gateway_running) {
                  setGatewayStartMsg(null);
                  setGatewayJobId(null);
                  clearInterval(gatewayPollRef.current);
                  showActionResult('success', 'Gateway is running');
                  fetchStatus();
                } else if (d.status === 'completed') {
                  setGatewayStartMsg(d.message || 'Script finished');
                  // Check if gateway actually started
                  setTimeout(() => {
                    fetchStatus();
                    setGatewayStartMsg(null);
                    setGatewayJobId(null);
                  }, 2000);
                  clearInterval(gatewayPollRef.current);
                } else if (d.status === 'error') {
                  setGatewayStartMsg(null);
                  setGatewayJobId(null);
                  clearInterval(gatewayPollRef.current);
                  showActionResult('error', d.message || 'Gateway start failed');
                } else {
                  setGatewayStartMsg(d.message || 'Starting gateway...');
                }
              } catch {
                // Transient error, keep polling
              }
            }, 3000);
            setActionLoading(null);
            return;
          } else if (res?.data?.status === 'already_running') {
            showActionResult('success', res.data.message || 'Gateway already running');
            setActionLoading(null);
            return;
          }
          break;
        case 'gateway-stop':
          res = await axios.post(`${ENGINE_URL}/api/gateway/stop`, {}, { timeout: 30000 });
          // Clear any gateway polling
          if (gatewayPollRef.current) clearInterval(gatewayPollRef.current);
          setGatewayJobId(null);
          setGatewayStartMsg(null);
          break;
        case 'login':
          res = await axios.post(`${ENGINE_URL}/api/gateway/login`, {}, { timeout: 30000 });
          break;
        case 'pipeline-start':
          if (!selectedConfig) {
            showActionResult('error', 'Select a config first');
            setActionLoading(null);
            return;
          }
          res = await axios.post(`${ENGINE_URL}/api/pipeline/start`, {
            config: selectedConfig,
            dry_run: dryRun,
          }, { timeout: 30000 });
          break;
        case 'pipeline-stop':
          res = await axios.post(`${ENGINE_URL}/api/pipeline/stop`, {}, { timeout: 30000 });
          break;
        default:
          break;
      }
      if (res?.data) {
        const d = res.data;
        const isOk = d.status === 'started' || d.status === 'stopped' ||
                     d.status === 'authenticated' || d.status === 'already_running' ||
                     d.status === 'not_running' || d.status === 'launched';
        showActionResult(isOk ? 'success' : 'error', d.message || d.status);
      }
      // Refresh status immediately
      setTimeout(() => { fetchStatus(); fetchLogs(); }, 1000);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Action failed';
      showActionResult('error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Cleanup gateway poll on unmount
  useEffect(() => {
    return () => {
      if (gatewayPollRef.current) clearInterval(gatewayPollRef.current);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchLogs();
    fetchRuns();
    fetchConfigs();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchStatus();
        fetchLogs();
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchStatus, fetchLogs]);

  // Scroll to bottom on new logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const switchSource = (source) => {
    setLogSource(source);
    fetchLogs(source);
  };

  const phase = status?.pipeline?.phase || 'idle';
  const phaseInfo = PHASE_LABELS[phase] || PHASE_LABELS.unknown;

  return (
    <div className="flex flex-col h-full">
      {/* Services overview */}
      <div className="p-3 border-b border-slate-700 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">System Status</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1 rounded transition-colors ${autoRefresh ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 hover:text-slate-300'}`}
              title={autoRefresh ? 'Auto-refresh ON (5s)' : 'Auto-refresh OFF'}
            >
              <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} style={autoRefresh ? { animationDuration: '3s' } : {}} />
            </button>
            {lastUpdate && (
              <span className="text-[9px] text-slate-600">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <ServiceRow
          label="Server"
          running={status?.gateway?.running}
          pid={status?.gateway?.pid}
          uptime={status?.gateway?.uptime}
          icon={Server}
        />
        <ServiceRow
          label="IBKR"
          running={status?.authenticated}
          icon={status?.authenticated ? Shield : ShieldOff}
          extra={status?.auth_updated}
        />
        <ServiceRow
          label="Pipeline"
          running={status?.pipeline?.running}
          pid={status?.pipeline?.pid}
          uptime={status?.pipeline?.uptime}
          icon={Radio}
        />

        {/* Phase indicator */}
        {status?.pipeline?.running && (
          <div className="flex items-center gap-2 mt-1 px-2 py-1 rounded bg-slate-800/70">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${phaseInfo.dot} animate-pulse`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${phaseInfo.color}`}>
              {phaseInfo.label}
            </span>
          </div>
        )}

        {/* Decisions summary */}
        {status?.decisions?.total_decisions > 0 && (
          <div className="mt-1 px-2 py-1 bg-slate-800/40 rounded space-y-0.5">
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-500">Decisions</span>
              <span className="text-[10px] text-slate-300 font-mono">{status.decisions.total_decisions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-500">Action Signals</span>
              <span className={`text-[10px] font-mono ${status.decisions.action_signals > 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                {status.decisions.action_signals}
              </span>
            </div>
            {status.decisions.last_timestamp && (
              <div className="flex justify-between">
                <span className="text-[10px] text-slate-500">Last</span>
                <span className="text-[10px] text-slate-400 font-mono">{status.decisions.last_timestamp}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action message toast */}
      {actionMsg && (
        <div className={`mx-3 mt-1 px-3 py-1.5 rounded text-[11px] flex items-center gap-2 ${
          actionMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                       : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {actionMsg.type === 'error' && <AlertTriangle size={12} />}
          <span className="truncate">{actionMsg.text}</span>
        </div>
      )}

      {/* Control buttons */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Power size={12} className="text-amber-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Controls</span>
        </div>
        {/* Server row */}
        <div className="flex items-center gap-1.5">
          {!status?.gateway?.running ? (
            <button
              onClick={() => handleAction('gateway-start')}
              disabled={!!actionLoading || !!gatewayJobId}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {(actionLoading === 'gateway-start' || gatewayJobId) ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {gatewayJobId ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <button
              onClick={() => handleAction('gateway-stop')}
              disabled={!!actionLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'gateway-stop' ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
              Stop Server
            </button>
          )}
          <button
            onClick={() => handleAction('login')}
            disabled={!!actionLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Check IBKR connectivity"
          >
            {actionLoading === 'login' ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} />}
            IBKR
          </button>
        </div>
        {/* Pipeline row */}
        <div className="flex items-center gap-1.5">
          {!status?.pipeline?.running ? (
            <>
              <select
                value={selectedConfig}
                onChange={(e) => setSelectedConfig(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-slate-300 focus:border-cyan-500 focus:outline-none appearance-none truncate"
              >
                <option value="">Select config...</option>
                {configs.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer select-none shrink-0" title="Dry run (no real orders)">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0" />
                Dry
              </label>
              <button
                onClick={() => handleAction('pipeline-start')}
                disabled={!!actionLoading || !selectedConfig}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {actionLoading === 'pipeline-start' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                Run
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction('pipeline-stop')}
              disabled={!!actionLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'pipeline-stop' ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
              Stop Pipeline
            </button>
          )}
        </div>

        {/* Server starting progress */}
        {gatewayStartMsg && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <Loader2 size={11} className="animate-spin text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-medium">{gatewayStartMsg}</span>
          </div>
        )}
      </div>

      {/* Log source selector */}
      <div className="flex border-b border-slate-700">
        {['pipeline', 'server', 'decisions'].map((src) => (
          <button
            key={src}
            onClick={() => switchSource(src)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              logSource === src
                ? 'text-cyan-400 border-b border-cyan-400 bg-slate-800/50'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            {src}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => { setShowRuns(!showRuns); fetchRuns(); }}
            className="px-2 py-1.5 text-[10px] text-slate-600 hover:text-slate-400"
            title="Browse run history"
          >
            <ChevronDown size={12} />
          </button>
          {showRuns && runs.length > 0 && (
            <div className="absolute right-0 top-full z-20 bg-slate-800 border border-slate-700 rounded shadow-xl w-56 max-h-48 overflow-y-auto">
              {runs.map((run) => (
                <button
                  key={run.name}
                  onClick={() => { switchSource(run.name); setShowRuns(false); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 flex justify-between items-center"
                >
                  <span className="font-mono truncate">{run.name}</span>
                  <div className="flex gap-1 ml-1 flex-shrink-0">
                    {run.has_log && <Terminal size={10} className="text-slate-500" />}
                    {run.has_decisions && <Zap size={10} className="text-yellow-500" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-950/50 space-y-0.5">
        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            Loading...
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs gap-2">
            <Terminal size={24} />
            <span>No logs available</span>
            <span className="text-[10px] text-slate-700">Start the gateway & pipeline to see output here</span>
          </div>
        )}
        {logs.map((entry, i) => (
          <LogLine key={i} entry={entry} />
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default PipelineMonitor;
