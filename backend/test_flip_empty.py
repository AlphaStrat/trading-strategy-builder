
from main import compile_to_pinescript

strategy = {
    "name": "Moving Average Flip (Empty Test)",
    "nodes": [
        {"id": "ema-12", "type": "indicator", "name": "EMA", "parameters": {"period": 12}, "position": {"x": 100, "y": 100}},
        {"id": "ema-26", "type": "indicator", "name": "EMA", "parameters": {"period": 26}, "position": {"x": 100, "y": 200}},
        {"id": "logic-buy", "type": "logic", "name": "Logic", "parameters": {"operator": "crossover", "value": 0}, "position": {"x": 300, "y": 100}},
        {"id": "logic-sell", "type": "logic", "name": "Logic", "parameters": {"operator": "crossunder", "value": 0}, "position": {"x": 300, "y": 300}},
        {"id": "action-buy", "type": "action", "name": "Action buy", "parameters": {"actionType": "buy", "stopLoss": "", "takeProfit": ""}, "position": {"x": 500, "y": 100}},
        {"id": "action-sell", "type": "action", "name": "Action sell", "parameters": {"actionType": "sell"}, "position": {"x": 500, "y": 300}}
    ],
    "connections": [
        {"source": "ema-12", "target": "logic-buy", "targetHandle": "a"},
        {"source": "ema-26", "target": "logic-buy", "targetHandle": "b"},
        {"source": "ema-12", "target": "logic-sell", "targetHandle": "a"},
        {"source": "ema-26", "target": "logic-sell", "targetHandle": "b"},
        {"source": "logic-buy", "target": "action-buy", "targetHandle": "default"},
        {"source": "logic-sell", "target": "action-sell", "targetHandle": "default"}
    ]
}

print(compile_to_pinescript(strategy))
