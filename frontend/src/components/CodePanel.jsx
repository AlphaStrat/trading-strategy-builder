import React from 'react';

const CodePanel = ({ code, language }) => {
    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-300 font-mono text-sm border-l border-slate-800">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-xs">
                    {language} Output
                </span>
                <button
                    className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-400 transition-colors"
                    onClick={() => navigator.clipboard.writeText(code)}
                >
                    Copy
                </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
                {code ? (
                    <pre className="whitespace-pre-wrap break-words">
                        <code>{code}</code>
                    </pre>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 italic">
                        Code will appear here...
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodePanel;
