import requests
import json

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
    ],
    "target_platform": "pinescript"
}

url = "http://127.0.0.1:8000/api/compile/temp?target=pinescript"
try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        code = response.json()["code"]
        print("--- GENERATED PINE SCRIPT ---")
        print(code)
        print("-----------------------------")
        
        # Simple assertions
        assert "hline(70" in code
        assert "hline(30" in code
        assert "shape.labelup" in code
        assert "text='BUY'" in code
        assert "linewidth=2" in code
        print("Verification successful!")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(e)
