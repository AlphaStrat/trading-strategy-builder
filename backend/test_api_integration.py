"""
AlphaStrat — App Backend (Proxy/Compiler) Integration Tests

Tests for the app/backend service that handles:
- Strategy compilation (PineScript, C#, MQL)
- Indicator definitions
- Strategy storage
- Proxy to server-local

Usage:
    # With app/backend running on port 8010:
    python -m pytest test_api_integration.py -v

    # Skip live tests:
    python -m pytest test_api_integration.py -v -k "not live"
"""

from __future__ import annotations

import os
import time
import uuid
from typing import Any

import pytest
import requests

# ─── Configuration ────────────────────────────────────────────────────────────

APP_BACKEND_URL = os.environ.get("APP_BACKEND_URL", "http://127.0.0.1:8010")
ENGINE_URL = os.environ.get("ENGINE_URL", "http://127.0.0.1:8020")
TIMEOUT = 15


# ─── Helpers ──────────────────────────────────────────────────────────────────

def app_api(method: str, path: str, **kwargs) -> requests.Response:
    url = f"{APP_BACKEND_URL}{path}"
    kwargs.setdefault("timeout", TIMEOUT)
    return getattr(requests, method)(url, **kwargs)


def engine_api(method: str, path: str, **kwargs) -> requests.Response:
    url = f"{ENGINE_URL}{path}"
    kwargs.setdefault("timeout", TIMEOUT)
    return getattr(requests, method)(url, **kwargs)


def is_app_backend_running() -> bool:
    try:
        r = requests.get(f"{APP_BACKEND_URL}/", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def is_engine_running() -> bool:
    try:
        r = requests.get(f"{ENGINE_URL}/api/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not is_app_backend_running(),
    reason=f"App backend not running at {APP_BACKEND_URL}",
)


# ─── Sample Data ──────────────────────────────────────────────────────────────

SAMPLE_STRATEGY = {
    "name": "Test RSI Strategy",
    "nodes": [
        {
            "id": "start-1",
            "type": "input",
            "name": "Strategy Start",
            "parameters": {},
            "position": {"x": 250, "y": 50},
        },
        {
            "id": "rsi-1",
            "type": "indicator",
            "name": "RSI",
            "parameters": {"period": 14},
            "position": {"x": 250, "y": 200},
        },
        {
            "id": "logic-1",
            "type": "logic",
            "name": "RSI < 30",
            "parameters": {"operator": "<", "value": 30},
            "position": {"x": 250, "y": 350},
        },
        {
            "id": "action-buy-1",
            "type": "action",
            "name": "Buy",
            "parameters": {"actionType": "buy"},
            "position": {"x": 250, "y": 500},
        },
    ],
    "connections": [
        {"source": "start-1", "target": "rsi-1"},
        {"source": "rsi-1", "target": "logic-1", "sourceHandle": None, "targetHandle": "a"},
        {"source": "logic-1", "target": "action-buy-1"},
    ],
    "target_platform": "pinescript",
}


# ═════════════════════════════════════════════════════════════════════════════
# 1. ROOT & INDICATORS
# ═════════════════════════════════════════════════════════════════════════════


class TestAppRoot:
    """Tests for the app backend root and indicator endpoints."""

    def test_root_returns_message(self):
        """GET / should return a welcome message."""
        r = app_api("get", "/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data

    def test_indicators_returns_list(self):
        """GET /api/indicators should return indicator definitions."""
        r = app_api("get", "/api/indicators")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    def test_indicator_has_required_fields(self):
        """Each indicator should have id, name, category."""
        r = app_api("get", "/api/indicators")
        for ind in r.json():
            assert "id" in ind
            assert "name" in ind
            assert "category" in ind

    def test_known_indicators_present(self):
        """RSI, SMA, EMA, MACD should be present."""
        r = app_api("get", "/api/indicators")
        names = {ind["name"] for ind in r.json()}
        for expected in ["RSI", "SMA", "EMA", "MACD"]:
            assert expected in names, f"{expected} not in app/backend indicators"


# ═════════════════════════════════════════════════════════════════════════════
# 2. STRATEGY COMPILATION
# ═════════════════════════════════════════════════════════════════════════════


class TestCompilation:
    """Tests for /api/compile/temp and /api/compile/{id}."""

    def test_compile_pinescript(self):
        """POST /api/compile/temp should generate PineScript code."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "pinescript"})
        assert r.status_code == 200
        data = r.json()
        assert "code" in data
        assert "language" in data
        assert data["language"] == "pinescript"
        code = data["code"]
        assert "//@version=5" in code
        assert "strategy(" in code

    def test_compile_csharp(self):
        """POST /api/compile/temp should generate C# stub."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "csharp"})
        assert r.status_code == 200
        data = r.json()
        assert "code" in data
        assert data["language"] == "csharp"

    def test_compile_mql(self):
        """POST /api/compile/temp should generate MQL stub."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "mql"})
        assert r.status_code == 200
        data = r.json()
        assert "code" in data
        assert data["language"] == "mql"

    def test_compile_invalid_target(self):
        """Unknown compilation target should return 400."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "rust"})
        assert r.status_code == 400

    def test_compile_rsi_generates_ta_rsi(self):
        """PineScript for RSI strategy should include ta.rsi()."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "pinescript"})
        code = r.json()["code"]
        assert "ta.rsi" in code

    def test_compile_with_logic_node(self):
        """Logic node with operator should produce comparison in PineScript."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "pinescript"})
        code = r.json()["code"]
        # Logic node with "<" operator and value 30
        assert "<" in code or "crossunder" in code or "crossover" in code

    def test_compile_with_action_node(self):
        """Action node should produce strategy.entry in PineScript."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "pinescript"})
        code = r.json()["code"]
        assert "strategy.entry" in code or "strategy.close" in code

    def test_compile_with_stop_loss_take_profit(self):
        """Action node with SL/TP should generate exit logic."""
        strategy = {
            **SAMPLE_STRATEGY,
            "nodes": [
                *SAMPLE_STRATEGY["nodes"][:3],
                {
                    "id": "action-buy-1",
                    "type": "action",
                    "name": "Buy",
                    "parameters": {"actionType": "buy", "stopLoss": "2", "takeProfit": "5"},
                    "position": {"x": 250, "y": 500},
                },
            ],
        }
        r = app_api("post", "/api/compile/temp", json=strategy, params={"target": "pinescript"})
        code = r.json()["code"]
        assert "stopLossPrice" in code or "Stop Loss" in code

    def test_compile_empty_strategy(self):
        """Strategy with only start node should still compile."""
        strategy = {
            "name": "Empty",
            "nodes": [{"id": "start-1", "type": "input", "name": "Strategy Start", "parameters": {}, "position": {"x": 0, "y": 0}}],
            "connections": [],
            "target_platform": "pinescript",
        }
        r = app_api("post", "/api/compile/temp", json=strategy, params={"target": "pinescript"})
        assert r.status_code == 200
        assert "//@version=5" in r.json()["code"]

    def test_compile_macd_strategy(self):
        """MACD indicator should generate ta.macd() in PineScript."""
        strategy = {
            "name": "MACD Test",
            "nodes": [
                {"id": "start-1", "type": "input", "name": "Strategy Start", "parameters": {}, "position": {"x": 0, "y": 0}},
                {"id": "macd-1", "type": "indicator", "name": "MACD", "parameters": {"fast": 12, "slow": 26, "signal": 9}, "position": {"x": 0, "y": 100}},
            ],
            "connections": [{"source": "start-1", "target": "macd-1"}],
            "target_platform": "pinescript",
        }
        r = app_api("post", "/api/compile/temp", json=strategy, params={"target": "pinescript"})
        code = r.json()["code"]
        assert "ta.macd" in code

    def test_compile_crossover_logic(self):
        """Logic node with crossover operator should use ta.crossover()."""
        strategy = {
            "name": "Crossover Test",
            "nodes": [
                {"id": "sma-1", "type": "indicator", "name": "SMA", "parameters": {"period": 10}, "position": {"x": 0, "y": 0}},
                {"id": "sma-2", "type": "indicator", "name": "SMA", "parameters": {"period": 20}, "position": {"x": 200, "y": 0}},
                {"id": "logic-1", "type": "logic", "name": "Cross", "parameters": {"operator": "crossover"}, "position": {"x": 100, "y": 150}},
            ],
            "connections": [
                {"source": "sma-1", "target": "logic-1", "targetHandle": "a"},
                {"source": "sma-2", "target": "logic-1", "targetHandle": "b"},
            ],
            "target_platform": "pinescript",
        }
        r = app_api("post", "/api/compile/temp", json=strategy, params={"target": "pinescript"})
        code = r.json()["code"]
        assert "ta.crossover" in code


# ═════════════════════════════════════════════════════════════════════════════
# 3. STRATEGY STORAGE
# ═════════════════════════════════════════════════════════════════════════════


class TestStrategyStorage:
    """Tests for /api/strategies (in-memory storage)."""

    def test_save_strategy(self):
        """POST /api/strategies should save and return an ID."""
        strategy = {
            "name": "Test Save",
            "nodes": SAMPLE_STRATEGY["nodes"],
            "connections": SAMPLE_STRATEGY["connections"],
        }
        r = app_api("post", "/api/strategies", json=strategy)
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert "message" in data

    def test_list_strategies(self):
        """GET /api/strategies should return saved strategies."""
        r = app_api("get", "/api/strategies")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ═════════════════════════════════════════════════════════════════════════════
# 4. CROSS-SERVICE: APP BACKEND ↔ SERVER-LOCAL
# ═════════════════════════════════════════════════════════════════════════════


@pytest.mark.skipif(
    not is_engine_running(),
    reason=f"Server-local not running at {ENGINE_URL}",
)
class TestCrossService:
    """Tests that verify the app backend and server-local work together.

    These ensure the frontend can compile strategies via app/backend
    AND run backtests via server-local — both using the same graph format.
    """

    def test_same_strategy_compiles_and_backtests(self):
        """A strategy graph should compile via :8010 AND backtest via :8020."""
        # Compile
        r_compile = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "pinescript"})
        assert r_compile.status_code == 200
        assert "code" in r_compile.json()

        # Backtest (async launch)
        backtest_payload = {
            "strategy": {
                "name": SAMPLE_STRATEGY["name"],
                "nodes": SAMPLE_STRATEGY["nodes"],
                "connections": SAMPLE_STRATEGY["connections"],
            },
            "symbols": ["AAPL"],
            "years": 1,
            "starting_cash": 10000,
            "slippage_bps": 5,
            "fee_bps": 0,
            "interval": "1d",
        }
        r_backtest = engine_api("post", "/api/backtest", json=backtest_payload, timeout=30)
        assert r_backtest.status_code == 200
        assert "job_id" in r_backtest.json()

    def test_indicators_consistent_between_services(self):
        """Both services should serve overlapping indicator sets."""
        r_app = app_api("get", "/api/indicators")
        r_engine = engine_api("get", "/api/indicators")

        app_names = {ind["name"] for ind in r_app.json()}
        engine_names = {ind["name"] for ind in r_engine.json()}

        # Core indicators should be in both
        core = {"RSI", "SMA", "EMA", "MACD"}
        assert core.issubset(app_names), f"App backend missing: {core - app_names}"
        assert core.issubset(engine_names), f"Server-local missing: {core - engine_names}"

    def test_config_from_engine_used_in_graph_conversion(self):
        """Configs listed by server-local should match graph-to-yaml output format."""
        r = engine_api("get", "/api/configs")
        configs = r.json()
        if not configs:
            pytest.skip("No configs available")

        # Get a config
        name = configs[0]["name"]
        r = engine_api("get", f"/api/configs/{name}")
        assert r.status_code == 200
        data = r.json()
        assert "yaml" in data
        assert "parsed" in data
        # parsed should be a dict (the config loaded by the engine)
        assert isinstance(data["parsed"], dict)


# ═════════════════════════════════════════════════════════════════════════════
# 5. VALIDATION
# ═════════════════════════════════════════════════════════════════════════════


class TestValidation:
    """Tests for strategy validation in app/backend."""

    def test_valid_strategy_passes(self):
        """A well-formed strategy should compile without validation errors."""
        r = app_api("post", "/api/compile/temp", json=SAMPLE_STRATEGY, params={"target": "pinescript"})
        assert r.status_code == 200

    def test_invalid_node_type_fails(self):
        """A node with an invalid type should fail validation."""
        strategy = {
            "name": "Bad Type",
            "nodes": [
                {"id": "bad-1", "type": "foobar", "name": "Bad", "parameters": {}, "position": {"x": 0, "y": 0}},
            ],
            "connections": [],
            "target_platform": "pinescript",
        }
        r = app_api("post", "/api/compile/temp", json=strategy, params={"target": "pinescript"})
        assert r.status_code == 400

    def test_missing_node_id_fails(self):
        """A node without an id should fail validation (422)."""
        strategy = {
            "name": "No ID",
            "nodes": [
                {"type": "indicator", "name": "RSI", "parameters": {}, "position": {"x": 0, "y": 0}},
            ],
            "connections": [],
            "target_platform": "pinescript",
        }
        r = app_api("post", "/api/compile/temp", json=strategy, params={"target": "pinescript"})
        assert r.status_code in (400, 422)
