#!/bin/bash

# Constellation AI Development Runner
# Starts both backend and frontend in development mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Constellation AI Development Environment${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start PostgreSQL if not running
echo -e "${YELLOW}Starting PostgreSQL...${NC}"
docker compose up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
until docker compose exec -T db pg_isready -U constellation > /dev/null 2>&1; do
    sleep 1
done
echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd backend
poetry run alembic upgrade head
cd ..

# Start backend in background
echo -e "${YELLOW}Starting backend server...${NC}"
cd backend
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo -e "${YELLOW}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}Development servers started!${NC}"
echo -e "  Backend:  http://localhost:8000"
echo -e "  Frontend: http://localhost:3000"
echo -e "  API Docs: http://localhost:8000/docs"
echo ""
echo -e "Press Ctrl+C to stop all servers"

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for either process to exit
wait
