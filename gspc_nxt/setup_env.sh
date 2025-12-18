#!/bin/bash
# GSPC-NEXT Environment Setup Script for Agents
# Usage: bash setup_env.sh

set -e
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting GSPC-NEXT Environment Setup...${NC}"

# 1. Check for Reference
if [ ! -d "gspc_reference" ]; then
    echo -e "\033[0;31mError: gspc_reference directory not found! Cannot proceed.\033[0m"
    exit 1
fi

# 2. Docker Infrastructure
echo -e "${BLUE}🐳 Generating docker-compose.yml...${NC}"
cat > docker-compose.yml <<EOF
version: '3.8'
services:
  db:
    image: mysql:8.0
    container_name: gspc-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: social_game_db
    ports:
      - "3306:3306"
    command: --default-authentication-plugin=mysql_native_password
  redis:
    image: redis:alpine
    container_name: gspc-redis
    restart: always
    ports:
      - "6379:6379"
EOF

# 3. Backend Setup (NestJS)
if [ ! -d "backend" ]; then
    echo -e "${BLUE}⚙️ Scaffolding Backend (NestJS)...${NC}"
    npx -y @nestjs/cli new backend --package-manager npm --skip-git --strict
    
    cd backend
    echo -e "${BLUE}📥 Installing Backend Dependencies...${NC}"
    npm install @nestjs/typeorm typeorm mysql2 @nestjs/config
    npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
    npm install class-validator class-transformer redis ioredis bcrypt @types/bcrypt @nestjs/jwt passport-jwt

    # Generate .env
    cat > .env <<EOF
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=social_game_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev_secret_key_v2
EOF
    cd ..
else
    echo -e "${GREEN}Backend exists. Skipping.${NC}"
fi

# 4. Frontend Setup (React)
if [ ! -d "frontend" ]; then
    echo -e "${BLUE}🎨 Scaffolding Frontend (React)...${NC}"
    npm create vite@latest frontend -- --template react-ts
    
    cd frontend
    echo -e "${BLUE}📥 Installing Frontend Dependencies...${NC}"
    npm install
    npm install three @types/three @react-three/fiber @react-three/drei
    npm install react-force-graph-3d three-spritetext
    npm install zustand socket.io-client axios clsx react-router-dom

    # 4.1 Asset Migration (Critical)
    echo -e "${BLUE}🖼️ Migrating Assets from Reference...${NC}"
    mkdir -p public/assets
    if [ -d "../gspc_reference/assets" ]; then
        cp -r "../gspc_reference/assets/"* public/assets/
        echo -e "${GREEN}✔ Assets copied successfully.${NC}"
    else
        echo -e "\033[0;33mWarning: gspc_reference/assets not found.${NC}"
    fi
    
    cd ..
else
    echo -e "${GREEN}Frontend exists. Skipping.${NC}"
fi

# 5. Git Ignore Setup
cat > .gitignore <<EOF
node_modules/
dist/
.env
.DS_Store
gspc_reference/
EOF

echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "Ready for coding. Please refer to AGENTS.md for logic details."