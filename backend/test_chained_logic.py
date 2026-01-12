import requests
import json

payload = {
    "name": "Chained Logic Strategy",
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
            "name": "RSI < 30",
            "parameters": {"operator": "<", "value": 30},
            "position": {"x": 200, "y": 0}
        },
        {
            "id": "logic-2",
            "type": "logicNode",
            "name": "Price > SMA",
            "parameters": {"operator": ">"},
            "position": {"x": 200, "y": 100}
        },
        {
            "id": "logic-3",
            "type": "logicNode",
            "name": "AND Condition",
            "parameters": {"operator": "and"},
            "position": {"x": 400, "y": 50}
        },
        {
            "id": "buy-1",
            "type": "actionNode",
            "name": "Action Buy",
            "parameters": {"actionType": "buy", "stopLoss": 1.5},
            "position": {"x": 600, "y": 50}
        }
    ],
    "connections": [
        {"source": "rsi-1", "target": "logic-1", "targetHandle": "a"},
        {"source": "sma-1", "target": "logic-2", "targetHandle": "b"}, # Compare Price (default a) to SMA (b)
        {"source": "logic-1", "target": "logic-3", "targetHandle": "a"},
        {"source": "logic-2", "target": "logic-3", "targetHandle": "b"},
        {"source": "logic-3", "target": "buy-1", "targetHandle": "default"}
    ],
    "target_platform": "pinescript"
}

url = "http://127.0.0.1:8002/api/compile/temp?target=pinescript"
try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(e)
