
from main import compile_to_pinescript

strategy = {
    "name": "Reproduction Strategy",
    "nodes": [
        {
            "id": "action-1",
            "type": "action",
            "name": "Buy",
            "parameters": {
                "actionType": "buy",
                "stopLoss": "",  # EMPTY
                "takeProfit": "" # EMPTY
            },
            "position": {"x": 500, "y": 100}
        }
    ],
    "connections": []
}

print(compile_to_pinescript(strategy))
