
from main import compile_to_pinescript

strategy = {
    "name": "Indicator Chain Test",
    "nodes": [
        {"id": "start", "type": "input", "name": "Strategy Start", "position": {"x": 50, "y": 50}},
        {"id": "ema-1", "type": "indicator", "name": "EMA", "parameters": {"period": 20}, "position": {"x": 200, "y": 50}},
        {"id": "rsi-1", "type": "indicator", "name": "RSI", "parameters": {"period": 14}, "position": {"x": 400, "y": 50}}
    ],
    "connections": [
        {"source": "start", "target": "ema-1", "targetHandle": "a"},
        {"source": "ema-1", "target": "rsi-1", "targetHandle": "default"}
    ]
}

print(compile_to_pinescript(strategy))
