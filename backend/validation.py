from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional

class NodeValidation(BaseModel):
    id: str
    type: str
    name: str
    parameters: Optional[Dict[str, Any]] = {}

    @validator('parameters', pre=True)
    def parse_numeric_params(cls, v):
        if not isinstance(v, dict): return v
        new_v = {}
        for key, value in v.items():
            try:
                if isinstance(value, str) and value.replace('.', '', 1).isdigit():
                    new_v[key] = float(value)
                else:
                    new_v[key] = value
            except:
                new_v[key] = value
        return new_v

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['indicator', 'logic', 'action', 'input', 'output', 'default']
        if v.lower() not in valid_types:
            # Also allow the 'node' suffixed types if they haven't been normalized yet
            if v.lower() not in ['indicatornode', 'logicnode', 'actionnode', 'inputnode', 'outputnode']:
                raise ValueError(f'Invalid node type: {v}')
        return v.lower()

def validate_strategy(strategy: Dict[str, Any]):
    for node in strategy.get("nodes", []):
        NodeValidation(**node)
    return True
