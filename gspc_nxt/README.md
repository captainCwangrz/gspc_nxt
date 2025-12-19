# GSPC-NEXT

Modern Social Graph Application (NestJS + React).

## Tech Stack

*   **Backend:** NestJS, TypeORM, Socket.io, SQLite (default for dev) / MySQL (production ready)
*   **Frontend:** React, Vite, Zustand, React-Force-Graph-3D

## Getting Started

### Backend

1.  Navigate to `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the server (uses SQLite by default):
    ```bash
    # For SQLite (Development)
    DB_TYPE=sqlite DB_NAME=gspc.db npm start

    # For MySQL (Production)
    # Set DB_TYPE=mysql, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars.
    ```

### Frontend

1.  Navigate to `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start development server:
    ```bash
    npm run dev
    ```

## Features

*   **Real-time Graph:** Visualizes social connections in 3D.
*   **Complex Relationships:** Supports DATING, CRUSH, BEEFING, etc. with specific business logic (e.g., Beefing overrides dating).
*   **Chat:** Real-time messaging with read receipts.
