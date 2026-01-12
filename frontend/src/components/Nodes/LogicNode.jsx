import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const LogicNode = ({ id, data, isConnectable }) => {
    const handleChange = (e) => {
        if (data.onParameterChange) {
            data.onParameterChange(id, e.target.name, e.target.value);
        }
    };

    return (
        <div className="bg-slate-900 border-2 border-orange-500 rounded-xl min-w-[140px] p-3 shadow-2xl relative">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
                Logic Engine
            </div>

            <div className="flex flex-col gap-3">
                {/* Input A */}
                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="a"
                        className="!bg-blue-500 !w-3 !h-3 !-left-4.5"
                        isConnectable={isConnectable}
                    />
                    <span className="absolute -left-7 text-[10px] font-black text-blue-400">A</span>
                    <select
                        name="operator"
                        onChange={handleChange}
                        value={data.parameters?.operator || data.operator || 'crossunder'}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500 transition-colors"
                    >
                        <option value="<">A &lt; B</option>
                        <option value=">">A &gt; B</option>
                        <option value="==">A == B</option>
                        <option value="crossunder">A Cross Under B</option>
                        <option value="crossover">A Cross Over B</option>
                    </select>
                </div>

                {/* Input B / Threshold */}
                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="b"
                        className="!bg-orange-500 !w-3 !h-3 !-left-4.5"
                        isConnectable={isConnectable}
                    />
                    <span className="absolute -left-7 text-[10px] font-black text-orange-400">B</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        name="value"
                        value={data.parameters?.value !== undefined ? data.parameters.value : ''}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="Value"
                    />
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!bg-slate-400 !w-3 !h-3 !-right-1.5"
            />

            <div className="mt-2 text-[8px] text-slate-600 text-center uppercase font-bold tracking-tighter">
                {id.split('-')[0]}
            </div>
        </div>
    );
};

export default memo(LogicNode);
