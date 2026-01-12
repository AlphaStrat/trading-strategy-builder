import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const ActionNode = ({ id, data, isConnectable }) => {
    const isBuy = data.actionType === 'buy';
    const colorClass = isBuy ? 'border-green-500' : 'border-red-500';
    const bgClass = isBuy ? 'bg-green-500/10' : 'bg-red-500/10';
    const textClass = isBuy ? 'text-green-400' : 'text-red-400';

    const handleParamChange = (e) => {
        if (data.onParameterChange) {
            data.onParameterChange(id, e.target.name, e.target.value);
        }
    };

    return (
        <div className={`bg-slate-900 border-2 ${colorClass} ${bgClass} rounded-2xl min-w-[120px] p-3 flex flex-col items-center justify-center shadow-lg ${isBuy ? 'action-node-buy-style' : 'action-node-sell-style'}`}>
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className={`!w-3 !h-3 ${isBuy ? '!bg-green-500' : '!bg-red-500'}`}
            />

            <div className={`font-black text-lg tracking-wider mb-2 ${textClass}`}>
                {isBuy ? 'BUY' : 'SELL'}
            </div>

            {isBuy && (
                <div className="w-full space-y-2 mt-1">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Stop Loss %</label>
                        <input
                            name="stopLoss"
                            type="text"
                            inputMode="decimal"
                            value={data.parameters?.stopLoss !== undefined ? data.parameters.stopLoss : ''}
                            onChange={handleParamChange}
                            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-green-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Take Profit %</label>
                        <input
                            name="takeProfit"
                            type="text"
                            inputMode="decimal"
                            value={data.parameters?.takeProfit !== undefined ? data.parameters.takeProfit : ''}
                            onChange={handleParamChange}
                            className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-green-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(ActionNode);
