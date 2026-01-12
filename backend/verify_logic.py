import json
import sys
import os

# Add the current directory to sys.path so we can import main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import compile_to_pinescript

payload = {
    "name": "Plotting Test Strategy",
    "nodes": [
        {
            "id": "ema-1",
            "type": "indicatorNode",
            "name": "EMA",
            "parameters": {"period": 10},
            "position": {"x": 0, "y": 0}
        },
        {
            "id": "ema-2",
            "type": "indicatorNode",
            "name": "EMA",
            "parameters": {"period": 20},
            "position": {"x": 0, "y": 100}
        },
        {
            "id": "rsi-1",
            "type": "indicatorNode",
            "name": "RSI",
            "parameters": {"period": 14},
            "position": {"x": 0, "y": 200}
        },
        {
            "id": "logic-1",
            "type": "logicNode",
            "name": "EMA Cross",
            "parameters": {"operator": "crossover"},
            "position": {"x": 200, "y": 50}
        },
        {
            "id": "buy-1",
            "type": "actionNode",
            "name": "Buy",
            "parameters": {"actionType": "buy", "stopLoss": 1.5},
            "position": {"x": 400, "y": 50}
        }
    ],
    "connections": [
        {"source": "ema-1", "target": "logic-1", "targetHandle": "a"},
        {"source": "ema-2", "target": "logic-1", "targetHandle": "b"},
        {"source": "logic-1", "target": "buy-1", "targetHandle": "default"}
    ]
}

try:
    code = compile_to_pinescript(payload)
    print("--- GENERATED PINE SCRIPT ---")
    print(code)
    print("-----------------------------")
    
    # Assertions
    assert "plot(rsi_1" in code, "Missing RSI plot"
    assert "hline(70" in code, "Missing RSI Upper line"
    assert "hline(30" in code, "Missing RSI Lower line"
    assert "shape.labelup" in code, "Missing Buy Label"
    assert "text='BUY'" in code, "Missing BUY text"
    assert "linewidth=1" in code, "Missing linewidth for EMA"
    print("Verification successful!")
except Exception as e:
    print(f"Verification failed: {e}")
    sys.exit(1)
