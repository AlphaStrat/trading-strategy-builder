import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const IndicatorNode = ({ id, data, isConnectable }) => {
    const handleChange = (e) => {
        if (data.onParameterChange) {
            data.onParameterChange(id, e.target.name, e.target.value);
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-600 rounded-md shadow-lg min-w-[150px] indicator-node-style">
            <div className="bg-slate-700 px-3 py-1 rounded-t-md border-b border-slate-600 flex justify-between items-center">
                <span className="font-bold text-xs text-slate-200">{data.label}</span>
            </div>
            <div className="px-3 pt-1 text-[10px] text-slate-500 truncate">
                {data.id ? data.id.split('-')[0] : '...'}
            </div>

            <div className="p-3 text-xs space-y-3">
                {(data.parameters || data.default_params) && Object.entries(data.parameters || data.default_params).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                        <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{key}</label>
                        <input
                            name={key}
                            type="text"
                            inputMode="decimal"
                            value={value}
                            onChange={handleChange}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                        />
                    </div>
                ))}
                {!(data.parameters || data.default_params) && (
                    <div className="text-slate-600 italic text-[10px] py-1">No parameters</div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!bg-green-500 !w-3 !h-3"
            />

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!bg-blue-500 !w-3 !h-3"
            />
        </div>
    );
};

export default memo(IndicatorNode);
