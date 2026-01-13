 # Algorithmic Trading Strategy Builder & Transpiler

This prototype is a full-stack platform that is part of the main project. This application is designed to close the gap between visual strategy intuition and executable algorithmic code. It enables traders to design, validate, and compile algorithmic trading strategies using a modular, visual dependency graph. Unlike simple drag-and-drop tools, this system functions as a **Domain-Specific Language (DSL) Transpiler**. It treats a visual trading strategy as an **Abstract Syntax Tree (AST)**, performing deep graph analysis to generate optimized Pine Script code.

### Techincal Implementation
*   **Topological Dependency**: Utilizes Kahn’s Algorithm to recursively resolve indicator-on-indicator dependencies (e.g., if an EMA strategy is also dependant on RSI values), ensuring that the generated code respects strict execution order.
*   **Signal Mutual Exclusion Architecture**: Implements state-snapshotting (`can_buy` / `can_sell` primitives) to eliminate "signal flicker" and ensure that entry/exit transitions are atomically consistent within a single bar.
*   **1:1 Signal-to-Execution Synchronization**: Engineered to ensure that visual chart annotations precisely match the strategy's internal execution state, solving the common "Phantom Signals" problem.
*   **Graph-Based Compilation**: Represents strategies as directed acyclic graphs (DAGs) using adjacency lists (Python dictionaries) for dependency tracking and in-degree counters for prerequisite validation, enabling O(1) lookups during topological sorting.
*   **Cycle Detection**: Validates strategies as executable DAGs, preventing impossible circular dependencies in complex indicator chains


![Visual Drag and Drop from Builder](images/strat-ema3.png)  
*Setting up Demo for EMA12 and EMA26 nodes.*

---

## Key Capabilities

- **Recursive Indicator Composition**: Create "Indicator Chains" where any technical indicator can serve as a source for another, enabling deep multi-layer analysis.
- **Modular Action Logic**: Decouples entry triggers from exit logic, allowing for "Flip" strategies (reversals) or traditional fixed-risk frameworks.
- **Dynamic Variable Scoping**: Automatically manages unique variable namespace isolation in the generated code, preventing naming collisions in complex strategies.
- **State-Persistent Risk Management**: Handles conditional Stop-Loss and Take-Profit logic as independent state machines, omitting unused logic to minimize cumulative script latency.

---

## Tech Stack & Algorithms

- **Frontend**: React.js with **React Flow** for dynamic graph visualization and state management.
- **Backend**: **FastAPI** (Python 3.10+) utilizing Pydantic for strict diagram validation of strategy graphs.
- **Core Algorithms**: 
    - **Topological Sorting** for dependency resolution.
    - **Graph Traversal** for recursive source routing.
    - **Transpilation Logic** for mapping Abstract Nodes to Pine Script v5 primitives.
- **Styling**: Tailwind CSS with custom internal design for a clean interface experience.

---

## Getting Started

### Backend Execution
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python main.py` (Default listener: port 8010)

### Frontend Environment
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Default listener: port 5173)

---

## Roadmap & Future Scope
- [ ] Potential Integration of C# (NinjaScript) and MQL5 transpilation layers.
- [ ] Direct integration with Interactive Brokers for live asset-exchange execution.
- [ ] Pre-compilation backtesting engine within the visual editor.
- [ ] Machine Learning Models to use within the workspace for trading strategies









