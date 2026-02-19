import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  useKeyPress,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Play, Download, Save } from 'lucide-react';

import IndicatorPanel from './components/IndicatorPanel';
import CodePanel from './components/CodePanel';
import BacktestPanel from './components/BacktestPanel';
import PipelineMonitor from './components/PipelineMonitor';
import ConfigEditor from './components/ConfigEditor';
import IndicatorNode from './components/Nodes/IndicatorNode';
import LogicNode from './components/Nodes/LogicNode';
import ActionNode from './components/Nodes/ActionNode';

const nodeTypes = {
  indicatorNode: IndicatorNode,
  logicNode: LogicNode,
  actionNode: ActionNode,
};

// Initial nodes
const initialNodes = [
  {
    id: 'start',
    type: 'input',
    data: { label: 'Strategy Start' },
    position: { x: 250, y: 50 },
    style: { background: '#22c55e', color: '#fff', border: 'none', width: 150 }
  },
];

const BACKEND_URL = 'http://127.0.0.1:8010'; // Use 8010 to guarantee a fresh server instance

function App() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [indicators, setIndicators] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('pinescript');
  const [generatedCode, setGeneratedCode] = useState('');
  const [strategyName, setStrategyName] = useState('My Alpha Strategy');
  const [isCompiling, setIsCompiling] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState([]);
  const [activeRightPanel, setActiveRightPanel] = useState('backtest'); // 'backtest' | 'monitor' | 'configs' | 'code'

  const deletePressed = useKeyPress(['Delete', 'Backspace']);

  useEffect(() => {
    if (deletePressed) {
      setNodes((nds) => nds.filter((node) => !node.selected));
      setEdges((eds) => eds.filter((edge) => !edge.selected));
    }
  }, [deletePressed, setNodes, setEdges]);

  const autoLayout = () => {
    const updatedNodes = nodes.map((node, index) => ({
      ...node,
      position: { x: 100 + (index * 200), y: 150 + (index % 3) * 150 }
    }));
    setNodes(updatedNodes);
  };

  // Fetch available indicators
  useEffect(() => {
    // In a real scenario, we'd fetch from backend.
    setIndicators([
      { id: "rsi", name: "RSI", category: "momentum", parameters: { period: 14 } },
      { id: "sma", name: "SMA", category: "trend", parameters: { period: 20 } },
      { id: "ema", name: "EMA", category: "trend", parameters: { period: 20 } }
    ]);
    axios.get(`${BACKEND_URL}/api/indicators`)
      .then(response => setIndicators(response.data))
      .catch(error => {
        console.error('Error fetching indicators:', error);
        // Fallback if backend is not running yet
        setIndicators([
          { id: "rsi", name: "RSI", category: "momentum" },
          { id: "macd", name: "MACD", category: "trend" },
          { id: "sma", name: "SMA", category: "trend" },
          { id: "ema", name: "EMA", category: "trend" },
          { id: "bollinger", "name": "Bollinger Bands", "category": "volatility" }
        ]);
      });
  }, []);

  // Strategy Management
  const saveStrategy = useCallback(() => {
    const strategy = {
      name: strategyName,
      nodes,
      edges,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(`strategy_${strategyName}`, JSON.stringify(strategy));
    alert('Strategy saved to local storage!');
  }, [strategyName, nodes, edges]);

  const exportStrategy = useCallback(() => {
    const data = {
      name: strategyName,
      nodes,
      edges,
      version: "1.0",
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategyName.replace(/\s+/g, '_')}.json`;
    a.click();
  }, [strategyName, nodes, edges]);

  const importRef = useRef(null);
  const importStrategy = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setStrategyName(data.name || 'Imported Strategy');

        // Inject callback into imported nodes
        const nodesWithCallback = (data.nodes || []).map(node => ({
          ...node,
          data: { ...node.data, onParameterChange }
        }));

        setNodes(nodesWithCallback);
        setEdges(data.edges || []);
      } catch (err) {
        alert('Error importing strategy: Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  const onConnect = useCallback(
    (params) => {
      const label = params.targetHandle === 'a' ? 'A' :
        params.targetHandle === 'b' ? 'B' : '';
      setEdges((eds) => addEdge({
        ...params,
        label,
        labelBgStyle: { fill: '#1e293b' },
        labelStyle: { fill: '#fff', fontSize: 10, fontWeight: 'bold' }
      }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const indicatorData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      const type = 'indicatorNode';

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${indicatorData.id}-${Date.now()}`,
        type,
        position,
        data: {
          label: indicatorData.name,
          ...indicatorData,
          parameters: indicatorData.parameters || indicatorData.default_params || {},
          onParameterChange
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Handle parameter changes from custom nodes
  const onParameterChange = useCallback((id, key, value) => {
    // Input validation: Only allow numbers and decimals for specific fields
    const numericFields = ['value', 'stopLoss', 'takeProfit', 'period', 'fast', 'slow', 'signal', 'std_dev', 'k', 'd'];
    if (numericFields.includes(key)) {
      // Allow only numbers, one dot, and empty string
      const sanitized = value.replace(/[^0-9.]/g, '');
      const parts = sanitized.split('.');
      if (parts.length > 2) return; // Block multiple dots
      value = sanitized;
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          const newParams = { ...(node.data.parameters || {}), [key]: value };
          const newData = { ...node.data, parameters: newParams };
          if (key === 'operator' || key === 'value' || key === 'stopLoss' || key === 'takeProfit') {
            newData[key] = value;
          }
          return { ...node, data: newData };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Removed useEffect injection as it was causing an infinite state loop.
  // Instead, onParameterChange is injected during node creation and import.

  const addIndicatorDirectly = (indicator) => {
    const newNode = {
      id: `${indicator.id}-${Date.now()}`,
      type: 'indicatorNode', // Use custom type
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: indicator.name,
        ...indicator,
        parameters: indicator.parameters || indicator.default_params || {},
        onParameterChange: onParameterChange
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const addLogicNode = () => {
    const newNode = {
      id: `logic-${Date.now()}`,
      type: 'logicNode',
      position: { x: 400, y: 300 },
      data: {
        parameters: { operator: 'crossunder', value: '' },
        onParameterChange
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const addActionNode = (type) => {
    const newNode = {
      id: `action-${Date.now()}`,
      type: 'actionNode',
      position: { x: 600, y: 300 },
      data: {
        actionType: type,
        parameters: { actionType: type, stopLoss: '', takeProfit: '' },
        onParameterChange
      } // 'buy' or 'sell'
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const compileStrategy = async () => {
    setIsCompiling(true);
    const strategy = {
      name: strategyName,
      nodes: nodes.map(node => {
        // Safe name resolution
        let nodeName = node.data.label;
        if (!nodeName) {
          if (node.type === 'logicNode') nodeName = 'Logic';
          else if (node.type === 'actionNode') nodeName = `Action ${node.data.actionType}`;
          else nodeName = 'Node';
        }

        let nodeType = node.type || 'indicator';
        // Map custom types to backend types
        if (node.type === 'indicatorNode' || node.type === 'default' || !node.type) nodeType = 'indicator';
        if (node.type === 'logicNode') nodeType = 'logic';
        if (node.type === 'actionNode') nodeType = 'action';

        const params = { ...(node.data || {}), ...(node.data.parameters || {}) };

        return {
          id: node.id,
          type: nodeType,
          name: nodeName,
          parameters: params,
          position: node.position
        };
      }),
      connections: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      })),
      target_platform: selectedPlatform
    };

    try {
      // Use the temp compile endpoint
      const response = await axios.post(`${BACKEND_URL}/api/compile/temp`, strategy, {
        params: { target: selectedPlatform }
      });
      setGeneratedCode(response.data.code);
    } catch (error) {
      console.error('Compilation error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      setGeneratedCode(`// Compilation Error:\n// ${errorMsg}\n\n// Make sure the backend is running at ${BACKEND_URL}`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-md z-10">
        <div className="container mx-auto flex justify-between items-center max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
              TS
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Strategy Builder
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
              placeholder="Strategy name"
            />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="pinescript">Pine Script (TradingView)</option>
              <option value="csharp">NinjaTrader (C#)</option>
              <option value="mql">MetaTrader (MQL)</option>
            </select>
            <button
              onClick={autoLayout}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-all active:scale-95"
            >
              Auto Layout
            </button>
            <div className="flex border-l border-slate-700 pl-4 ml-2 gap-2">
              <button
                onClick={saveStrategy}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                title="Save Strategy"
              >
                <Save size={16} />
              </button>
              <button
                onClick={exportStrategy}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                title="Export JSON"
              >
                <Download size={16} />
              </button>
              <input
                type="file"
                ref={importRef}
                onChange={importStrategy}
                className="hidden"
                accept=".json"
              />
              <button
                onClick={() => importRef.current.click()}
                className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-200"
              >
                Import
              </button>
            </div>
            <button
              onClick={compileStrategy}
              disabled={isCompiling}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} />
              {isCompiling ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Indicators */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex-shrink-0 z-10">
          <IndicatorPanel indicators={indicators} onAddIndicator={addIndicatorDirectly} />
        </div>

        {/* Center - Flow canvas */}
        <div className="flex-1 relative bg-slate-900" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-900"
            >
              <Background color="#334155" gap={20} />
              <Controls className="bg-slate-700 border-slate-600 fill-white" />
              <MiniMap className="bg-slate-800 border-slate-700" maskColor="rgba(30, 41, 59, 0.7)" nodeColor="#475569" />
            </ReactFlow>

            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <button onClick={addLogicNode} className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold shadow-lg">
                + Logic
              </button>
              <button onClick={() => addActionNode('buy')} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold shadow-lg">
                + Buy
              </button>
              <button onClick={() => addActionNode('sell')} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shadow-lg">
                + Sell
              </button>
            </div>
          </ReactFlowProvider>
        </div>

        {/* Right sidebar - Generated code / Backtest */}
        <div className="w-1/3 min-w-[300px] max-w-[600px] bg-slate-900 border-l border-slate-700 flex-shrink-0 z-10 shadow-xl flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-700">
            {[
              { key: 'backtest', label: 'Backtest', active: 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50' },
              { key: 'monitor', label: 'Monitor', active: 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' },
              { key: 'configs', label: 'Configs', active: 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/50' },
              { key: 'code', label: 'Code', active: 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveRightPanel(tab.key)}
                className={`flex-1 px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeRightPanel === tab.key
                    ? tab.active
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {activeRightPanel === 'backtest' && (
              <BacktestPanel nodes={nodes} edges={edges} strategyName={strategyName} />
            )}
            {activeRightPanel === 'monitor' && (
              <PipelineMonitor />
            )}
            {activeRightPanel === 'configs' && (
              <ConfigEditor nodes={nodes} edges={edges} strategyName={strategyName} />
            )}
            {activeRightPanel === 'code' && (
              <CodePanel code={generatedCode} language={selectedPlatform} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
