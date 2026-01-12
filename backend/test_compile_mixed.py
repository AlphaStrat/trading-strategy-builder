from main import compile_to_pinescript
import json

payload = {
    "name": "RSI + SMA Strategy",
    "nodes": [
        {
            "id": "rsi-1",
            "type": "indicatorNode",
            "name": "RSI",
            "parameters": {"period": 14},
            "position": {"x": 0, "y": 0}
        },
        {
            "id": "sma-1",
            "type": "indicatorNode",
            "name": "SMA",
            "parameters": {"period": 50},
            "position": {"x": 0, "y": 100}
        },
        {
            "id": "logic-1",
            "type": "logicNode",
            "name": "Logic",
            "parameters": {"operator": "crossunder", "value": 30},
            "position": {"x": 100, "y": 0}
        },
        {
            "id": "buy-1",
            "type": "actionNode",
            "name": "Action buy",
            "parameters": {"actionType": "buy", "stopLoss": 1.5},
            "position": {"x": 200, "y": 0}
        }
    ],
    "connections": [
        {
            "source": "rsi-1",
            "target": "logic-1",
            "sourceHandle": "default",
            "targetHandle": "a"
        },
        {
            "source": "logic-1",
            "target": "buy-1",
            "sourceHandle": "default",
            "targetHandle": "default"
        }
    ],
    "target_platform": "pinescript"
}

code = compile_to_pinescript(payload)
print(code)
