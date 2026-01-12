
from main import compile_to_pinescript

strategy = {
    "name": "My Alpha Strategy",
    "nodes": [
        {
            "id": "start",
            "type": "input",
            "name": "Strategy Start",
            "position": {"x": 250, "y": 50}
        },
        {
            "id": "rsi-1",
            "type": "indicator",
            "name": "RSI",
            "parameters": {"period": 14},
            "position": {"x": 100, "y": 200}
        },
        {
            "id": "logic-1",
            "type": "logic",
            "name": "Logic",
            "parameters": {"operator": "crossunder", "value": 30},
            "position": {"x": 100, "y": 400}
        },
        {
            "id": "action-1",
            "type": "action",
            "name": "Action buy",
            "parameters": {
                "actionType": "buy",
                "stopLoss": 1.5,
                "takeProfit": 3.0
            },
            "position": {"x": 100, "y": 600}
        }
    ],
    "connections": [
        {"source": "rsi-1", "target": "logic-1", "targetHandle": "a"},
        {"source": "logic-1", "target": "action-1", "targetHandle": "default"}
    ]
}

print(compile_to_pinescript(strategy))
