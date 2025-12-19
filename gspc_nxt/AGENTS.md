# GSPC-NEXT: V2 Upgrade & Migration Guide

> **CRITICAL CONTEXT FOR AGENTS:**
> You are performing a **FULL STACK UPGRADE** of a legacy PHP social graph application (`gspc2`).
> The legacy code is located in the `gspc_reference/` directory for your reference.
> **YOUR MISSION:** Re-implement the existing functionality using a modern **NestJS + React** stack. You must improve performance (Socket.io instead of polling) while strictly preserving the complex business logic found in the legacy PHP files.

## 1. Workspace Structure

```text
/ (Project Root)
├── AGENTS.md            <-- You are reading this
├── gspc_reference/      <-- [READ ONLY] Legacy Source of Truth
│   ├── api/             <-- Backend Logic (auth, data, relations, messages)
│   ├── config/          <-- Constants (Relation IDs) & DB Config
│   ├── public/js/       <-- Frontend Logic (graph.js, ui.js)
│   ├── assets/          <-- Avatar Images
│   └── dashboard.php    <-- Main UI Layout
├── backend/             <-- [Target] NestJS Application
└── frontend/            <-- [Target] React + Vite Application

```

## 2. The Upgrade Strategy (Old vs. New)

You are not just copying code; you are **upgrading** the architecture.

| Feature | Legacy Implementation (PHP/jQuery) | V2 Modern Implementation (NestJS/React) |
| --- | --- | --- |
| **Real-time Data** | HTTP Long-polling (`api/data.php`) | **Socket.io** (Events: `graph_update`, `new_msg`) |
| **3D Rendering** | Imperative Three.js (`graph.js`) | Declarative **React-Force-Graph-3D** (`WorldGraph.tsx`) |
| **Authentication** | PHP Sessions (`auth.php`) | **JWT** (Stateless, stored in client localStorage) |
| **State Management** | Global JS variables (`window.State`) | **Zustand** Store (`useGraphStore`, `useUserStore`) |
| **Database Query** | Raw SQL loops | **TypeORM** + MySQL 8.0 Recursive CTEs |
| **UI Components** | Direct DOM manipulation (`ui.js`) | React Functional Components (`HUD.tsx`, `Chat.tsx`) |

## 3. Core Business Logic (Must Be Preserved)

**⚠️ CRITICAL:** The logic in `gspc_reference/api/relations.php` and `config/constants.php` is complex. Do not simplify it.

### 3.1 Relationship Types (Source: `config/constants.php`)

You must define a TypeScript Enum in `backend/src/common/constants.ts` that matches these IDs exactly:

* **Undirected (Symmetric):**
* `DATING`, `BEST_FRIEND`, `BROTHER`, `SISTER`
* `BEEFING` (Mutual Hostility - Red Link)


* **Directed (Asymmetric):**
* `CRUSH` (One-way "I like you" - Pink Link)



### 3.2 State Machine Logic (Source: `api/relations.php`)

* **Exclusivity:** A pair of users (A, B) usually has only ONE active relationship.
* **Upgrade Path:** If A has a `CRUSH` on B, and B accepts a `DATING` request from A -> The system must **DELETE** the `CRUSH` rows and **INSERT** a `DATING` row.
* **Beefing:** If A "Beefs" B, it overrides friendly relationships.

## 4. Migration Map (File by File)

Use this table to find where to put the logic from the legacy files.

| Legacy File (`gspc_reference/`) | Logic Description | V2 Destination |
| --- | --- | --- |
| **`config/constants.php`** | Relation Type IDs | **`backend/src/common/constants.ts`** |
| **`api/data.php`** | Graph Nodes Fetching | **`backend/src/modules/graph/graph.service.ts`** |
| **`api/relations.php`** | Relationship Logic | **`backend/src/modules/relationships/relationships.service.ts`** |
| **`api/messages.php`** | Chat History/Send | **`backend/src/modules/chat/chat.service.ts`** |
| **`public/js/graph.js`** | Visual "Focus Mode" | **`frontend/src/components/WorldGraph.tsx`** (Implement focus via camera controls) |
| **`dashboard.php`** | Main Protected View | **`frontend/src/pages/DashboardPage.tsx`** |
| **`index.php`** | Login Entry | **`frontend/src/pages/LoginPage.tsx`** |


