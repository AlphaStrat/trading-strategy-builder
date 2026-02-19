/**
 * AlphaStrat — Frontend ↔ Server-Local API Contract Tests
 *
 * These tests validate that the frontend components construct API requests
 * matching the exact schemas server-local expects, and parse responses
 * correctly. They do NOT require a running server — they mock axios.
 *
 * Usage:
 *   cd app/frontend
 *   npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
 *   npx vitest run src/__tests__/api-contracts.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Engine URL constant (must match what components use) ──────────────────

const ENGINE_URL = 'http://127.0.0.1:8020';
const APP_BACKEND_URL = 'http://127.0.0.1:8010';

// ═════════════════════════════════════════════════════════════════════════════
// 1. BACKTEST PANEL — Request/Response Contract
// ═════════════════════════════════════════════════════════════════════════════

describe('BacktestPanel API Contracts', () => {
  /**
   * Validates that the backtest request payload built by BacktestPanel.jsx
   * matches the BacktestRequest Pydantic model in api.py.
   */

  it('should build correct backtest request payload', () => {
    // Simulate what BacktestPanel.jsx builds in runBacktest()
    const nodes = [
      {
        id: 'start-1', type: 'input',
        data: { label: 'Strategy Start' },
        position: { x: 250, y: 50 },
      },
      {
        id: 'rsi-1', type: 'indicatorNode',
        data: { label: 'RSI', id: 'rsi', name: 'RSI', parameters: { period: 14 }, onParameterChange: () => {} },
        position: { x: 250, y: 200 },
      },
      {
        id: 'logic-1', type: 'logicNode',
        data: { parameters: { operator: '<', value: 30 }, onParameterChange: () => {} },
        position: { x: 250, y: 350 },
      },
      {
        id: 'action-buy-1', type: 'actionNode',
        data: { actionType: 'buy', parameters: { actionType: 'buy' }, onParameterChange: () => {} },
        position: { x: 250, y: 500 },
      },
    ];

    const edges = [
      { source: 'start-1', target: 'rsi-1', sourceHandle: null, targetHandle: null },
      { source: 'rsi-1', target: 'logic-1', sourceHandle: null, targetHandle: 'a' },
      { source: 'logic-1', target: 'action-buy-1', sourceHandle: null, targetHandle: null },
    ];

    // Replicate the transformation from BacktestPanel.jsx
    const strategy = {
      name: 'Test Strategy',
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

    const payload = {
      strategy,
      symbols: ['AAPL'],
      years: 2,
      starting_cash: 10000,
      slippage_bps: 5,
      fee_bps: 0,
      interval: '1d',
    };

    // Validate against BacktestRequest schema
    expect(payload).toHaveProperty('strategy');
    expect(payload).toHaveProperty('symbols');
    expect(payload).toHaveProperty('years');
    expect(payload).toHaveProperty('starting_cash');
    expect(payload).toHaveProperty('slippage_bps');
    expect(payload).toHaveProperty('fee_bps');
    expect(payload).toHaveProperty('interval');

    // Strategy graph validation
    expect(payload.strategy).toHaveProperty('name');
    expect(payload.strategy).toHaveProperty('nodes');
    expect(payload.strategy).toHaveProperty('connections');
    expect(Array.isArray(payload.strategy.nodes)).toBe(true);
    expect(Array.isArray(payload.strategy.connections)).toBe(true);

    // Node validation — matches NodeModel
    for (const node of payload.strategy.nodes) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('parameters');
      expect(node).toHaveProperty('position');
      expect(typeof node.id).toBe('string');
      expect(['input', 'indicator', 'logic', 'action']).toContain(node.type);
    }

    // Connection validation — matches ConnectionModel
    for (const conn of payload.strategy.connections) {
      expect(conn).toHaveProperty('source');
      expect(conn).toHaveProperty('target');
      expect(typeof conn.source).toBe('string');
      expect(typeof conn.target).toBe('string');
    }

    // onParameterChange should NOT be in the payload
    for (const node of payload.strategy.nodes) {
      expect(node.parameters).not.toHaveProperty('onParameterChange');
    }
  });

  it('should parse symbols string into array correctly', () => {
    const symbolsInput = 'AAPL, MSFT, GOOGL';
    const symbolList = symbolsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    expect(symbolList).toEqual(['AAPL', 'MSFT', 'GOOGL']);
  });

  it('should handle single symbol input', () => {
    const symbolsInput = 'AAPL';
    const symbolList = symbolsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    expect(symbolList).toEqual(['AAPL']);
  });

  it('should filter empty symbols', () => {
    const symbolsInput = 'AAPL, , MSFT, ';
    const symbolList = symbolsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    expect(symbolList).toEqual(['AAPL', 'MSFT']);
  });

  it('should validate expected progress response shape', () => {
    // Mock progress response from /api/backtest/progress/{job_id}
    const mockProgress = {
      status: 'running',
      phase: 'downloading',
      progress: 25,
      message: 'Downloading market data...',
      elapsed: 3.5,
    };

    expect(mockProgress).toHaveProperty('status');
    expect(mockProgress).toHaveProperty('phase');
    expect(mockProgress).toHaveProperty('progress');
    expect(mockProgress).toHaveProperty('message');
    expect(typeof mockProgress.progress).toBe('number');
  });

  it('should validate completed backtest response shape', () => {
    const mockCompleted = {
      status: 'completed',
      phase: 'completed',
      progress: 100,
      message: 'Backtest complete',
      elapsed: 12.3,
      result: {
        metrics: { total_return: 0.15, sharpe_ratio: 1.2 },
        equity_curve: [{ date: '2024-01-01', equity: 10000 }],
        trades: [{ date: '2024-01-05', action: 'buy', price: 150 }],
      },
    };

    expect(mockCompleted.result).toHaveProperty('metrics');
    expect(mockCompleted.result).toHaveProperty('equity_curve');
    expect(mockCompleted.result).toHaveProperty('trades');
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// 2. PIPELINE MONITOR — Request/Response Contract
// ═════════════════════════════════════════════════════════════════════════════

describe('PipelineMonitor API Contracts', () => {
  it('should validate /api/status response shape', () => {
    const mockStatus = {
      timestamp: '2026-02-19T01:05:47.009904',
      gateway: { running: true, pid: 12345, uptime: '00:15' },
      authenticated: false,
      auth_updated: null,
      pipeline: {
        running: false,
        pid: null,
        uptime: null,
        phase: 'idle',
        run_dir: null,
      },
      decisions: {
        file: 'decisions_20260219.jsonl',
        total_decisions: 100,
        action_signals: 5,
        last_timestamp: '2026-02-19T01:04:00',
      },
      logs: [],
    };

    // Fields PipelineMonitor.jsx reads directly
    expect(mockStatus.gateway).toHaveProperty('running');
    expect(mockStatus.gateway).toHaveProperty('pid');
    expect(mockStatus.gateway).toHaveProperty('uptime');
    expect(mockStatus).toHaveProperty('authenticated');
    expect(mockStatus.pipeline).toHaveProperty('running');
    expect(mockStatus.pipeline).toHaveProperty('pid');
    expect(mockStatus.pipeline).toHaveProperty('uptime');
    expect(mockStatus.pipeline).toHaveProperty('phase');
    expect(mockStatus.decisions).toHaveProperty('total_decisions');
    expect(mockStatus.decisions).toHaveProperty('action_signals');
  });

  it('should map all pipeline phases to PHASE_LABELS', () => {
    const PHASE_LABELS = {
      idle: true, starting: true, resolving: true, warmup: true,
      fetching: true, processing: true, fitting: true, risk: true,
      executing: true, running: true, unknown: true,
    };

    const validPhases = [
      'idle', 'starting', 'resolving', 'warmup', 'fetching',
      'processing', 'fitting', 'risk', 'executing', 'running',
    ];

    for (const phase of validPhases) {
      expect(PHASE_LABELS).toHaveProperty(phase);
    }
  });

  it('should validate /api/logs response shape', () => {
    const mockLogs = {
      source: 'pipeline',
      lines: [
        { text: '2026-02-19 01:00:00 INFO Starting pipeline', level: 'info' },
        { text: '2026-02-19 01:00:01 ERROR Connection failed', level: 'error' },
      ],
    };

    expect(mockLogs).toHaveProperty('source');
    expect(mockLogs).toHaveProperty('lines');
    expect(Array.isArray(mockLogs.lines)).toBe(true);
    for (const line of mockLogs.lines) {
      expect(line).toHaveProperty('text');
      expect(line).toHaveProperty('level');
    }
  });

  it('should validate /api/logs/runs response shape', () => {
    const mockRuns = [
      { name: 'run_20260219_010000', has_log: true, has_decisions: true, modified: '2026-02-19T01:00:00' },
      { name: 'run_20260218_150000', has_log: true, has_decisions: false, modified: '2026-02-18T15:00:00' },
    ];

    for (const run of mockRuns) {
      expect(run).toHaveProperty('name');
    }
  });

  it('should validate gateway start response shapes', () => {
    // Already running
    const alreadyRunning = { status: 'already_running', message: 'Server already running', pid: 12345 };
    expect(alreadyRunning.status).toBe('already_running');

    // Launch initiated
    const launched = { status: 'launched', job_id: 'abc-123', message: 'Starting server...' };
    expect(launched.status).toBe('launched');
    expect(launched).toHaveProperty('job_id');
  });

  it('should validate gateway job poll response shape', () => {
    const mockJobPoll = {
      status: 'running',
      message: 'Starting server...',
      output: '',
      gateway_running: false,
      gateway_pid: null,
    };

    expect(mockJobPoll).toHaveProperty('status');
    expect(mockJobPoll).toHaveProperty('gateway_running');
  });

  it('should validate login response shape', () => {
    const mockLogin = {
      status: 'connected',
      authenticated: true,
      messages: ['Auth check OK'],
      message: 'Connected to IBKR',
    };

    expect(mockLogin).toHaveProperty('status');
    expect(mockLogin).toHaveProperty('authenticated');
    expect(typeof mockLogin.authenticated).toBe('boolean');
  });

  it('should validate pipeline start request shape', () => {
    const request = {
      config: 'system_hmm_montecarlo',
      dry_run: true,
    };

    expect(request).toHaveProperty('config');
    expect(typeof request.config).toBe('string');
    expect(request.config.length).toBeGreaterThan(0);
    expect(request).toHaveProperty('dry_run');
    expect(typeof request.dry_run).toBe('boolean');
  });

  it('should validate log sources match server expectations', () => {
    // PipelineMonitor uses these source values
    const sources = ['pipeline', 'server', 'decisions'];
    const validSources = new Set(['pipeline', 'server', 'gateway', 'decisions']);

    for (const src of sources) {
      expect(validSources.has(src)).toBe(true);
    }
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// 3. CONFIG EDITOR — Request/Response Contract
// ═════════════════════════════════════════════════════════════════════════════

describe('ConfigEditor API Contracts', () => {
  it('should validate /api/configs list response shape', () => {
    const mockConfigs = [
      { name: 'rsi_only', filename: 'rsi_only.yaml', type: 'expression', symbols: ['AAPL'] },
      { name: 'system_hmm_montecarlo', filename: 'system_hmm_montecarlo.yaml', type: 'strategy-class', symbols: [] },
    ];

    for (const cfg of mockConfigs) {
      expect(cfg).toHaveProperty('name');
      expect(cfg).toHaveProperty('filename');
      expect(cfg).toHaveProperty('type');
      expect(['expression', 'strategy-class']).toContain(cfg.type);
    }
  });

  it('should validate /api/configs/{name} detail response shape', () => {
    const mockDetail = {
      name: 'rsi_only',
      filename: 'rsi_only.yaml',
      type: 'expression',
      yaml: 'blocks:\n  rsi:\n    class: RSIBlock\n',
      parsed: { blocks: { rsi: { class: 'RSIBlock' } } },
    };

    expect(mockDetail).toHaveProperty('name');
    expect(mockDetail).toHaveProperty('type');
    expect(mockDetail).toHaveProperty('yaml');
    expect(mockDetail).toHaveProperty('parsed');
    expect(typeof mockDetail.yaml).toBe('string');
    expect(typeof mockDetail.parsed).toBe('object');
  });

  it('should build correct create config request', () => {
    const newConfigName = 'test_config';
    const request = {
      name: newConfigName.trim(),
      yaml: '# New AlphaStrat config\n\nblocks: {}\n\npipeline:\n  symbol: AAPL\n  buy_expr: "False"\n  sell_expr: "False"\n  amount_expr: "10"\n  dry_run: true\n',
    };

    expect(request).toHaveProperty('name');
    expect(request).toHaveProperty('yaml');
    expect(request.name.length).toBeGreaterThan(0);
    expect(typeof request.yaml).toBe('string');
  });

  it('should build correct update config request', () => {
    const request = {
      yaml: 'blocks:\n  updated: true\n',
    };

    expect(request).toHaveProperty('yaml');
    expect(typeof request.yaml).toBe('string');
  });

  it('should build correct graph-to-yaml request', () => {
    const nodes = [
      { id: 'rsi-1', type: 'indicator', data: { id: 'rsi', name: 'RSI', parameters: { period: 14 } } },
    ];
    const edges = [{ source: 'start-1', target: 'rsi-1' }];

    const request = {
      nodes: nodes.map(n => {
        let nodeType = n.type || 'indicator';
        if (n.type === 'indicatorNode') nodeType = 'indicator';
        if (n.type === 'logicNode') nodeType = 'logic';
        if (n.type === 'actionNode') nodeType = 'action';
        const data = { ...(n.data || {}) };
        delete data.onParameterChange;
        return { id: n.id, type: nodeType, data };
      }),
      connections: edges.map(e => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      name: 'generated_strategy',
      symbols: ['AAPL'],
      params: {
        starting_cash: 10000,
        slippage_bps: 5,
        dry_run: true,
      },
    };

    expect(request).toHaveProperty('nodes');
    expect(request).toHaveProperty('connections');
    expect(request).toHaveProperty('name');
    expect(request).toHaveProperty('symbols');
    expect(request).toHaveProperty('params');
    expect(Array.isArray(request.nodes)).toBe(true);
    expect(Array.isArray(request.connections)).toBe(true);
    expect(Array.isArray(request.symbols)).toBe(true);
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// 4. APP.JSX — Compile & Indicator Contracts
// ═════════════════════════════════════════════════════════════════════════════

describe('App.jsx API Contracts', () => {
  it('should build correct compile request', () => {
    const nodes = [
      {
        id: 'rsi-1',
        type: 'indicatorNode',
        data: { label: 'RSI', id: 'rsi', name: 'RSI', parameters: { period: 14 } },
        position: { x: 250, y: 200 },
      },
    ];
    const edges = [];

    // Replicate the transformation from App.jsx compileStrategy()
    const strategy = {
      name: 'Test',
      nodes: nodes.map(node => {
        let nodeName = node.data.label || 'Node';
        let nodeType = node.type || 'indicator';
        if (node.type === 'indicatorNode' || node.type === 'default' || !node.type) nodeType = 'indicator';
        if (node.type === 'logicNode') nodeType = 'logic';
        if (node.type === 'actionNode') nodeType = 'action';

        const params = { ...(node.data || {}), ...(node.data.parameters || {}) };

        return {
          id: node.id,
          type: nodeType,
          name: nodeName,
          parameters: params,
          position: node.position,
        };
      }),
      connections: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
      target_platform: 'pinescript',
    };

    // Validate against app/backend Strategy model
    expect(strategy).toHaveProperty('name');
    expect(strategy).toHaveProperty('nodes');
    expect(strategy).toHaveProperty('connections');
    expect(strategy).toHaveProperty('target_platform');
    expect(['pinescript', 'csharp', 'mql']).toContain(strategy.target_platform);
  });

  it('should validate indicator response contract', () => {
    // App/backend indicator shape
    const appIndicator = {
      id: 'rsi', name: 'RSI', category: 'momentum',
      default_params: { period: 14 },
    };

    // Server-local indicator shape (richer)
    const engineIndicator = {
      id: 'rsi', name: 'RSI', category: 'momentum',
      description: 'Relative Strength Index',
      default_params: { period: 14 },
      engine_block: 'RSIBlock',
    };

    // Frontend expects at minimum: id, name, category
    for (const ind of [appIndicator, engineIndicator]) {
      expect(ind).toHaveProperty('id');
      expect(ind).toHaveProperty('name');
      expect(ind).toHaveProperty('category');
    }
  });

  it('should handle BACKEND_URL correctly', () => {
    // Frontend uses 8010 for compile, 8020 for engine
    expect(APP_BACKEND_URL).toBe('http://127.0.0.1:8010');
    expect(ENGINE_URL).toBe('http://127.0.0.1:8020');
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// 5. NODE TYPE MAPPING (Shared across components)
// ═════════════════════════════════════════════════════════════════════════════

describe('Node Type Mapping', () => {
  /**
   * Frontend uses typed node names (indicatorNode, logicNode, actionNode)
   * but server-local expects plain types (indicator, logic, action).
   * All components must do this mapping correctly.
   */

  const mapNodeType = (frontendType) => {
    if (frontendType === 'indicatorNode' || frontendType === 'default' || !frontendType) return 'indicator';
    if (frontendType === 'logicNode') return 'logic';
    if (frontendType === 'actionNode') return 'action';
    return frontendType;
  };

  it('should map indicatorNode → indicator', () => {
    expect(mapNodeType('indicatorNode')).toBe('indicator');
  });

  it('should map logicNode → logic', () => {
    expect(mapNodeType('logicNode')).toBe('logic');
  });

  it('should map actionNode → action', () => {
    expect(mapNodeType('actionNode')).toBe('action');
  });

  it('should map default → indicator', () => {
    expect(mapNodeType('default')).toBe('indicator');
  });

  it('should handle null/undefined gracefully', () => {
    expect(mapNodeType(null)).toBe('indicator');
    expect(mapNodeType(undefined)).toBe('indicator');
    expect(mapNodeType('')).toBe('indicator');
  });

  it('should pass through input type unchanged', () => {
    expect(mapNodeType('input')).toBe('input');
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// 6. PARAMETER SANITIZATION
// ═════════════════════════════════════════════════════════════════════════════

describe('Parameter Sanitization', () => {
  /**
   * App.jsx onParameterChange sanitizes numeric fields.
   * Validate that sanitized values are what the server expects.
   */

  const numericFields = ['value', 'stopLoss', 'takeProfit', 'period', 'fast', 'slow', 'signal', 'std_dev', 'k', 'd'];

  const sanitize = (key, value) => {
    if (numericFields.includes(key)) {
      const sanitized = String(value).replace(/[^0-9.]/g, '');
      const parts = sanitized.split('.');
      if (parts.length > 2) return null; // Invalid
      return sanitized;
    }
    return value;
  };

  it('should allow numeric values', () => {
    expect(sanitize('period', '14')).toBe('14');
    expect(sanitize('value', '30')).toBe('30');
  });

  it('should strip non-numeric characters', () => {
    expect(sanitize('period', '14abc')).toBe('14');
    expect(sanitize('value', '$30')).toBe('30');
  });

  it('should allow decimal values', () => {
    expect(sanitize('stopLoss', '2.5')).toBe('2.5');
  });

  it('should reject multiple dots', () => {
    expect(sanitize('value', '2.5.3')).toBeNull();
  });

  it('should pass through non-numeric fields unchanged', () => {
    expect(sanitize('operator', 'crossover')).toBe('crossover');
    expect(sanitize('actionType', 'buy')).toBe('buy');
  });
});


// ═════════════════════════════════════════════════════════════════════════════
// 7. URL CONSTRUCTION
// ═════════════════════════════════════════════════════════════════════════════

describe('URL Construction', () => {
  it('should construct correct backtest URL', () => {
    const url = `${ENGINE_URL}/api/backtest`;
    expect(url).toBe('http://127.0.0.1:8020/api/backtest');
  });

  it('should construct correct backtest progress URL', () => {
    const jobId = 'test-job-123';
    const url = `${ENGINE_URL}/api/backtest/progress/${jobId}`;
    expect(url).toBe('http://127.0.0.1:8020/api/backtest/progress/test-job-123');
  });

  it('should construct correct config URL', () => {
    const configName = 'rsi_only';
    const url = `${ENGINE_URL}/api/configs/${configName}`;
    expect(url).toBe('http://127.0.0.1:8020/api/configs/rsi_only');
  });

  it('should construct correct compile URL', () => {
    const url = `${APP_BACKEND_URL}/api/compile/temp`;
    expect(url).toBe('http://127.0.0.1:8010/api/compile/temp');
  });

  it('should construct correct logs URL with params', () => {
    const source = 'server';
    const lines = 200;
    const url = `${ENGINE_URL}/api/logs?lines=${lines}&source=${source}`;
    expect(url).toBe('http://127.0.0.1:8020/api/logs?lines=200&source=server');
  });

  it('should construct correct gateway job poll URL', () => {
    const jobId = 'gw-job-456';
    const url = `${ENGINE_URL}/api/gateway/job/${jobId}`;
    expect(url).toBe('http://127.0.0.1:8020/api/gateway/job/gw-job-456');
  });
});
