import requests
import json

payload = {
    "name": "Test Strategy",
    "nodes": [
        {
            "id": "rsi-1",
            "type": "indicatorNode",
            "name": "RSI",
            "parameters": {"period": 14},
            "position": {"x": 0, "y": 0}
        },
        {
            "id": "logic-1",
            "type": "logicNode",
            "name": "Logic",
            "parameters": {"operator": "<", "value": 30},
            "position": {"x": 100, "y": 0}
        },
        {
            "id": "buy-1",
            "type": "actionNode",
            "name": "Action buy",
            "parameters": {"actionType": "buy", "stopLoss": 2.0},
            "position": {"x": 200, "y": 0}
        }
    ],
    "connections": [
        {
            "source": "rsi-1",
            "target": "logic-1",
            "sourceHandle": None,
            "targetHandle": "a"
        },
        {
            "source": "logic-1",
            "target": "buy-1",
            "sourceHandle": None,
            "targetHandle": None  # Default handle on Action node
        }
    ],
    "target_platform": "pinescript"
}

url = "http://127.0.0.1:8010/api/compile/temp?target=pinescript"
try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(response.json())
except Exception as e:
    print(e)
