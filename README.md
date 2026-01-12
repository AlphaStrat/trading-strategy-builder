# Visual Trading Strategy Builder & Transpiler

A high-performance full-stack application that allows users to design algorithmic trading strategies through a visual dependency graph and compile them into executable Pine Script (TradingView).

## 🚀 Key Features

- **Visual Dependency Graph**: Build complex strategies using a drag-and-drop interface powered by React Flow.
- **Advanced Indicator Chaining**: Support for recursive indicator-on-indicator calculations (e.g., RSI of an EMA).
- **Modular Transpiler**: A custom backend engine that translates graph-based Abstract Syntax Trees (AST) into production-ready code.
- **Signal Mutual Exclusion**: Built-in protection against signal flicker and "same-bar double flips" using state snapshotting.
- **Professional Risk Management**: Dynamic and optional Stop-Loss/Take-Profit controls that omit unused logic for cleaner scripts.
- **Real-Time Validation**: Strict numeric validation and parameter checking across the entire stack.

## 🛠 Tech Stack

- **Frontend**: React, React Flow, Tailwind CSS, Vite, Axios.
- **Backend**: Python (FastAPI), Pydantic, Uvicorn.
- **Algorithms**: Topological Sorting (Kahn's Algorithm) for dependency resolution, Graph Traversal.
- **Logic**: Pine Script v5 standards.

## 🏗 System Architecture

The application is architected as a modular transpiler.
1. **Frontend**: Captures the strategy as a JSON-based dependency graph.
2. **Topological Engine**: The backend performs a topological sort on the nodes to determine the correct execution order (ensuring dependencies like indicators are calculated before the logic nodes that use them).
3. **Synchronization Layer**: Ensures that chart-based visual signals and execution-level triggers are perfectly synchronized, eliminating visual discrepancies.

## 🚦 Getting Started

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python main.py` (Runs on port 8010)

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Runs on port 5173)


