import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Save, Plus, Trash2, Download, Upload, RefreshCw, Check, X, AlertTriangle, ChevronRight, Eye, Edit3, Code } from 'lucide-react';
import axios from 'axios';

const ENGINE_URL = 'http://127.0.0.1:8020';

const CONFIG_TYPE_COLORS = {
  'expression': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'strategy-class': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'unknown': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const ConfigListItem = ({ config, isActive, onClick, onDelete }) => {
  const typeColor = CONFIG_TYPE_COLORS[config.type] || CONFIG_TYPE_COLORS.unknown;
  const symbols = Array.isArray(config.symbols) ? config.symbols.filter(Boolean) : [];

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors border-l-2 ${
        isActive
          ? 'bg-slate-800 border-cyan-400'
          : 'border-transparent hover:bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-slate-500 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-200 truncate">{config.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 ml-5">
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${typeColor}`}>
            {config.type}
          </span>
          {symbols.length > 0 && (
            <span className="text-[9px] text-slate-600 truncate">
              {symbols.slice(0, 3).join(', ')}{symbols.length > 3 ? '...' : ''}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={12} className={`flex-shrink-0 transition-transform ${isActive ? 'text-cyan-400 rotate-90' : 'text-slate-600'}`} />
    </div>
  );
};

const ConfigEditor = ({ nodes, edges, strategyName }) => {
  const [configs, setConfigs] = useState([]);
  const [activeConfig, setActiveConfig] = useState(null);
  const [yamlContent, setYamlContent] = useState('');
  const [originalYaml, setOriginalYaml] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'editor' | 'generate'
  const [generateParams, setGenerateParams] = useState({
    symbols: 'AAPL',
    starting_cash: '10000',
    slippage_bps: '5',
    dry_run: true,
  });

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await axios.get(`${ENGINE_URL}/api/configs`, { timeout: 5000 });
      setConfigs(res.data || []);
    } catch {
      setError('Failed to fetch configs');
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const loadConfig = async (configName) => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${ENGINE_URL}/api/configs/${configName}`, { timeout: 5000 });
      setActiveConfig(res.data);
      setYamlContent(res.data.yaml);
      setOriginalYaml(res.data.yaml);
      setIsEditing(false);
      setSaveStatus(null);
      setView('editor');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!activeConfig) return;
    try {
      setIsSaving(true);
      setSaveStatus(null);
      await axios.put(`${ENGINE_URL}/api/configs/${activeConfig.name}`, {
        yaml: yamlContent,
      }, { timeout: 5000 });
      setOriginalYaml(yamlContent);
      setSaveStatus('saved');
      setIsEditing(false);
      fetchConfigs();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const createConfig = async () => {
    if (!newConfigName.trim()) {
      setError('Config name cannot be empty');
      return;
    }
    try {
      setError('');
      await axios.post(`${ENGINE_URL}/api/configs/new`, {
        name: newConfigName.trim(),
        yaml: '# New AlphaStrat config\n\nblocks: {}\n\npipeline:\n  symbol: AAPL\n  buy_expr: "False"\n  sell_expr: "False"\n  amount_expr: "10"\n  dry_run: true\n',
      }, { timeout: 10000 });
      setShowNewForm(false);
      const savedName = newConfigName.trim();
      setNewConfigName('');
      setSuccessMsg(`Config "${savedName}" created`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchConfigs();
      loadConfig(savedName);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const status = err.response?.status;
      if (status === 409) {
        setError(`Config "${newConfigName.trim()}" already exists`);
      } else if (status === 400) {
        setError(detail || 'Invalid config data');
      } else {
        setError(detail || `Failed to create config (${err.message})`);
      }
    }
  };

  const deleteConfig = async (name) => {
    try {
      await axios.delete(`${ENGINE_URL}/api/configs/${name}`, { timeout: 5000 });
      if (activeConfig?.name === name) {
        setActiveConfig(null);
        setYamlContent('');
        setView('list');
      }
      setShowDeleteConfirm(null);
      fetchConfigs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const generateFromGraph = async () => {
    if (!nodes || nodes.length <= 1) {
      setError('Build a strategy on the canvas first');
      return;
    }

    const mappedNodes = nodes.map(node => {
      let nodeType = node.type || 'indicator';
      if (node.type === 'indicatorNode' || node.type === 'default') nodeType = 'indicator';
      if (node.type === 'logicNode') nodeType = 'logic';
      if (node.type === 'actionNode') nodeType = 'action';
      const data = { ...(node.data || {}) };
      delete data.onParameterChange;
      return { id: node.id, type: nodeType, data };
    });

    const mappedConnections = edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }));

    const symbolList = generateParams.symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    try {
      setLoading(true);
      const res = await axios.post(`${ENGINE_URL}/api/graph-to-yaml`, {
        nodes: mappedNodes,
        connections: mappedConnections,
        name: strategyName || 'generated_strategy',
        symbols: symbolList,
        params: {
          starting_cash: parseFloat(generateParams.starting_cash) || 10000,
          slippage_bps: parseFloat(generateParams.slippage_bps) || 0,
          dry_run: generateParams.dry_run,
        },
      }, { timeout: 10000 });
      setYamlContent(res.data.yaml);
      setOriginalYaml('');
      setActiveConfig({ name: '(generated)', type: 'expression', filename: 'generated.yaml' });
      setIsEditing(true);
      setView('editor');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate YAML');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = yamlContent !== originalYaml;

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Pipeline Configs</h3>
            </div>
            <div className="flex gap-1">
              <button
                onClick={fetchConfigs}
                className="p-1 text-slate-500 hover:text-slate-300 rounded"
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
              <button
                onClick={() => setShowNewForm(true)}
                className="p-1 text-emerald-400 hover:text-emerald-300 rounded"
                title="New config"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Generate from graph button */}
          <button
            onClick={() => setView('generate')}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-[11px] font-bold border border-amber-600/30 transition-colors"
          >
            <Code size={12} />
            Generate YAML from Strategy
          </button>

          {/* New config form */}
          {showNewForm && (
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                placeholder="config_name"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && createConfig()}
                autoFocus
              />
              <button onClick={createConfig} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
              <button onClick={() => setShowNewForm(false)} className="p-1 text-slate-500 hover:text-slate-300"><X size={14} /></button>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-3 mt-2 px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />{error}
            <button onClick={() => setError('')} className="ml-auto"><X size={10} /></button>
          </div>
        )}

        {successMsg && (
          <div className="mx-3 mt-2 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-400 flex items-center gap-1.5">
            <Check size={12} />{successMsg}
          </div>
        )}

        {/* Config list */}
        <div className="flex-1 overflow-y-auto">
          {configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs gap-2">
              <FileText size={24} />
              <span>No configs found</span>
            </div>
          ) : (
            configs.map((cfg) => (
              <div key={cfg.name} className="relative group">
                <ConfigListItem
                  config={cfg}
                  isActive={activeConfig?.name === cfg.name}
                  onClick={() => loadConfig(cfg.name)}
                />
                {showDeleteConfirm === cfg.name ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-slate-900 rounded p-1 border border-slate-700 z-10">
                    <button onClick={() => deleteConfig(cfg.name)} className="p-0.5 text-red-400 hover:text-red-300" title="Confirm delete"><Check size={12} /></button>
                    <button onClick={() => setShowDeleteConfirm(null)} className="p-0.5 text-slate-500 hover:text-slate-300" title="Cancel"><X size={12} /></button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(cfg.name); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // GENERATE VIEW
  if (view === 'generate') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setView('list')} className="text-slate-500 hover:text-slate-300">
              <ChevronRight size={14} className="rotate-180" />
            </button>
            <Code size={14} className="text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Generate YAML</h3>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Convert your visual strategy into a pipeline YAML config file.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Symbols</label>
              <input
                type="text"
                value={generateParams.symbols}
                onChange={(e) => setGenerateParams(p => ({ ...p, symbols: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                placeholder="AAPL, MSFT"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Capital $</label>
                <input
                  type="number"
                  value={generateParams.starting_cash}
                  onChange={(e) => setGenerateParams(p => ({ ...p, starting_cash: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Slip (bps)</label>
                <input
                  type="number"
                  value={generateParams.slippage_bps}
                  onChange={(e) => setGenerateParams(p => ({ ...p, slippage_bps: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateParams.dry_run}
                onChange={(e) => setGenerateParams(p => ({ ...p, dry_run: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[11px] text-slate-400">Dry run (no real orders)</span>
            </label>
          </div>

          <button
            onClick={generateFromGraph}
            disabled={loading}
            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate YAML'}
          </button>

          {error && (
            <div className="mt-2 px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // EDITOR VIEW
  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button onClick={() => { setView('list'); setActiveConfig(null); }} className="text-slate-500 hover:text-slate-300">
              <ChevronRight size={14} className="rotate-180" />
            </button>
            <FileText size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-slate-200 truncate">{activeConfig?.name || 'Config'}</span>
            {activeConfig?.type && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${CONFIG_TYPE_COLORS[activeConfig.type] || CONFIG_TYPE_COLORS.unknown}`}>
                {activeConfig.type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {saveStatus === 'saved' && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={10} />Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle size={10} />Error</span>
            )}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded"
                title="Edit"
              >
                <Edit3 size={12} />
              </button>
            ) : (
              <>
                {hasChanges && (
                  <button
                    onClick={() => { setYamlContent(originalYaml); setIsEditing(false); }}
                    className="p-1 text-slate-500 hover:text-slate-300 rounded"
                    title="Discard changes"
                  >
                    <X size={12} />
                  </button>
                )}
                {activeConfig?.name !== '(generated)' && (
                  <button
                    onClick={saveConfig}
                    disabled={isSaving || !hasChanges}
                    className="p-1 text-emerald-400 hover:text-emerald-300 rounded disabled:opacity-30"
                    title="Save"
                  >
                    <Save size={12} />
                  </button>
                )}
              </>
            )}
            {/* Save generated as new config */}
            {activeConfig?.name === '(generated)' && yamlContent && (
              <button
                onClick={() => {
                  const name = prompt('Config name:', strategyName?.replace(/\s+/g, '_').toLowerCase() || 'my_strategy');
                  if (name) {
                    axios.post(`${ENGINE_URL}/api/configs/new`, { name, yaml: yamlContent })
                      .then(() => { fetchConfigs(); loadConfig(name); })
                      .catch((err) => setError(err.response?.data?.detail || 'Failed to save'));
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-emerald-600/20 text-emerald-400 rounded border border-emerald-600/30 hover:bg-emerald-600/30"
              >
                <Save size={10} />Save As
              </button>
            )}
          </div>
        </div>
        {hasChanges && (
          <div className="text-[9px] text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Unsaved changes
          </div>
        )}
      </div>

      {error && (
        <div className="mx-3 mt-2 px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400 flex items-center gap-1.5">
          <AlertTriangle size={12} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={10} /></button>
        </div>
      )}

      {/* YAML content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">Loading...</div>
        ) : isEditing ? (
          <textarea
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            className="w-full h-full bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed p-3 resize-none focus:outline-none border-none"
            spellCheck={false}
          />
        ) : (
          <pre className="w-full h-full bg-slate-950/50 text-slate-300 font-mono text-[11px] leading-relaxed p-3 overflow-auto whitespace-pre-wrap">
            {yamlContent || 'Select a config to view'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ConfigEditor;
