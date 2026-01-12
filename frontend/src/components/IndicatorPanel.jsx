import React from 'react';

const IndicatorPanel = ({ indicators, onAddIndicator }) => {
    const onDragStart = (event, indicator) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(indicator));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="h-full flex flex-col p-4">
            <h3 className="text-lg font-bold mb-4 text-slate-200">Indicators</h3>
            <div className="space-y-3 overflow-y-auto pr-2">
                {indicators.map((ind) => (
                    <div
                        key={ind.id}
                        className="p-3 bg-slate-700 rounded-lg cursor-grab hover:bg-slate-600 transition-colors border border-slate-600 shadow-sm"
                        draggable
                        onDragStart={(e) => onDragStart(e, ind)}
                        onClick={() => onAddIndicator(ind)}
                    >
                        <div className="font-medium text-slate-100">{ind.name}</div>
                        <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{ind.category}</div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Instructions</h3>
                <p className="text-xs text-slate-500">
                    Drag indicators onto the canvas or click to add them instantly. Connect nodes to define flow.
                </p>
            </div>
        </div>
    );
};

export default IndicatorPanel;
