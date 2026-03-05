#!/usr/bin/env bash
# StudySync – Launch Script
# Usage:
#   bash start.sh          → production (clean DB + start)
#   bash start.sh dev      → development (clean DB + seed demo users + start)
#   bash start.sh restart  → restart only (no DB reset)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-production}"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║       StudySync – Starting Up...      ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# ── 0. Kill anything already on our ports ───────────────────
echo "→ Cleaning up old processes..."
kill $(lsof -ti:4000) 2>/dev/null || true
kill $(lsof -ti:5173) 2>/dev/null || true
sleep 1
echo "  ✓ Ports cleared"

# ── 1. PostgreSQL ───────────────────────────────────────────
echo "→ Checking PostgreSQL..."
if ! command -v psql &>/dev/null; then
  echo "  Installing PostgreSQL..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi
if ! pg_isready -q 2>/dev/null; then
  echo "  Starting PostgreSQL service..."
  sudo service postgresql start
  sleep 2
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='studysync'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER studysync WITH PASSWORD 'studysync123';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='studysync'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE studysync OWNER studysync;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE studysync TO studysync;" 2>/dev/null || true
echo "  ✓ PostgreSQL ready"

# ── 2. Install dependencies ────────────────────────────────
echo "→ Installing dependencies..."
cd "$SCRIPT_DIR/backend"  && npm install --silent
cd "$SCRIPT_DIR/frontend" && npm install --silent
echo "  ✓ Dependencies installed"

# ── 3. Database setup (skip on restart) ────────────────────
if [ "$MODE" != "restart" ]; then
  echo "→ Running database migration..."
  cd "$SCRIPT_DIR/backend"
  node src/db/setup.js

  # Dev seed (if dev mode)
  if [ "$MODE" = "dev" ]; then
    echo "→ Seeding development data..."
    node src/db/dev-seed.js
  fi
fi

# ── 4. Launch ──────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          StudySync is Starting!          ║"
echo "║                                          ║"
echo "║  Backend:  http://localhost:4000          ║"
echo "║  Frontend: http://localhost:5173          ║"
echo "║                                          ║"
if [ "$MODE" = "dev" ]; then
echo "║  Demo login: anjali@demo.com             ║"
echo "║  Password:   demo1234                    ║"
echo "║                                          ║"
fi
echo "║  Press Ctrl+C to stop both servers       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Start backend
cd "$SCRIPT_DIR/backend" && npm run dev &
BACKEND_PID=$!
sleep 2

# Start frontend
cd "$SCRIPT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!
sleep 3

# Open browser
xdg-open http://localhost:5173 2>/dev/null || true

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'StudySync stopped.'" EXIT

wait $BACKEND_PID $FRONTEND_PID
