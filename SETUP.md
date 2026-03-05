# 🔧 StudySync — Setup & Connection Guide

Complete instructions to get StudySync running from scratch on any Linux/macOS machine.

---

## Prerequisites

| Requirement | Version | Check command |
|------------|---------|--------------|
| Node.js | v18+ | `node --version` |
| npm | v9+ | `npm --version` |
| PostgreSQL | 14+ | `psql --version` |

---

## Method 1: Automatic Setup (Recommended)

```bash
# Clone the repo
git clone <your-repo-url> StudySync
cd StudySync

# Launch everything (DB setup + servers)
bash start.sh dev
```

This will:
1. ✅ Check/install PostgreSQL
2. ✅ Create the `studysync` database and user
3. ✅ Install all npm dependencies
4. ✅ Run the full database migration
5. ✅ Seed 12 demo users
6. ✅ Start backend on `http://localhost:4000`
7. ✅ Start frontend on `http://localhost:5173`
8. ✅ Open browser automatically

**Demo login:** `anjali@demo.com` / `demo1234`

---

## Method 2: Manual Step-by-Step

### Step 1: Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo service postgresql start
```

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Step 2: Create Database & User

```bash
# Open PostgreSQL shell as superuser
sudo -u postgres psql

# Run these SQL commands:
CREATE USER studysync WITH PASSWORD 'studysync123';
CREATE DATABASE studysync OWNER studysync;
GRANT ALL PRIVILEGES ON DATABASE studysync TO studysync;
\q
```

### Step 3: Configure Backend Environment

Create/verify `backend/.env`:

```env
DATABASE_URL=postgresql://studysync:studysync123@localhost:5432/studysync
JWT_SECRET=studysync_jwt_super_secret_key_2026
PORT=4000
CLIENT_URL=http://localhost:5173
```

> ⚠️ **Production:** Change `JWT_SECRET` to a strong random string and set `CLIENT_URL` to your frontend domain.

### Step 4: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 5: Set Up Database Schema

```bash
cd backend

# Create all tables, types, indexes, and constraints
npm run setup-db

# (Optional) Seed demo users for development
npm run seed-dev
```

### Step 6: Start the Backend

```bash
cd backend

# Development (with auto-restart on changes)
npm run dev

# Production
npm start
```

You should see:
```
🚀 StudySync API running on http://localhost:4000
   Security: helmet ✓  rate-limit ✓  CORS → http://localhost:5173
   Routes: auth, users, buddies, messages, sessions, notifications, rooms
   Socket.io: real-time chat + study rooms
```

### Step 7: Start the Frontend

```bash
cd frontend

# Development
npm run dev

# Production build
npm run build
npm run preview
```

You should see:
```
  VITE v4.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## How Things Connect

```
┌─────────────────────┐         ┌──────────────────────┐
│                     │  HTTP   │                      │
│   React Frontend    │────────▸│   Express Backend    │
│   (localhost:5173)  │  REST   │   (localhost:4000)   │
│                     │         │                      │
│   Vite Dev Server   │◂───────▸│   Socket.IO Server   │
│                     │  WS     │                      │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                                           │ pg driver
                                           │
                                ┌──────────▼───────────┐
                                │                      │
                                │    PostgreSQL DB     │
                                │   (localhost:5432)   │
                                │                      │
                                │  Database: studysync │
                                │  User: studysync     │
                                └──────────────────────┘
```

### Connection Details

| Component | Connects To | How |
|-----------|------------|-----|
| **Frontend** → Backend API | `http://localhost:4000/api` | Axios HTTP client (`src/api.js`) |
| **Frontend** → Backend Socket | `http://localhost:4000` | socket.io-client |
| **Backend** → Database | `postgresql://...localhost:5432/studysync` | pg Pool (`src/db.js`) |
| **Backend** → Frontend (CORS) | `http://localhost:5173` | `CLIENT_URL` env var |

### Authentication Flow

```
1. User registers/logs in → POST /api/auth/register or /login
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. Every API request includes: Authorization: Bearer <token>
5. Backend middleware (auth.js) verifies JWT on protected routes
```

---

## Troubleshooting

### "address already in use :::4000"
```bash
# Kill whatever is using port 4000
kill $(lsof -ti:4000) 2>/dev/null
# Then restart
```

### "type room_permission already exists"
This means old types weren't cleaned up. The updated `setup.js` handles this:
```bash
cd backend && npm run setup-db
```

### "connection refused" to PostgreSQL
```bash
# Make sure PostgreSQL is running
sudo service postgresql start
# Or on macOS:
brew services start postgresql@15
```

### Frontend can't reach backend
1. Check backend is running on port 4000: `curl http://localhost:4000/api/health`
2. Check `CLIENT_URL` in `backend/.env` matches the frontend port
3. Check browser console for CORS errors

### Database reset
To completely reset all data:
```bash
cd backend && npm run setup-db
# Optionally re-seed
npm run seed-dev
```

---

## Production Deployment

### Environment Changes

| Variable | Dev Value | Production Value |
|----------|----------|-----------------|
| `JWT_SECRET` | `studysync_jwt_super_secret_key_2026` | Strong random 64-char string |
| `CLIENT_URL` | `http://localhost:5173` | `https://your-domain.com` |
| `DATABASE_URL` | Local PostgreSQL | Hosted DB URL |
| `NODE_ENV` | (unset) | `production` |

### Build Frontend for Production
```bash
cd frontend
npm run build
# Serve the `dist/` folder with Nginx, Vercel, etc.
```

### Run Backend in Production
```bash
cd backend
NODE_ENV=production npm start
# Or use PM2:
pm2 start src/server.js --name studysync-api
```
