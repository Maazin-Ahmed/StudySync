# 📚 StudySync

**A real-time collaborative study platform that connects students globally for focused study sessions.**

> Find study partners • Create study rooms • Track progress • Stay motivated

---

## ✨ Features

### 🏠 Study Rooms
Create and join live study sessions with four flexible permission levels:
- **Open** — Anyone can join instantly
- **Link Access** — Share a private link (with optional expiry & max uses)
- **Request to Join** — Approve who joins your session
- **Private** — Invite-only with buddy list selection

### 👥 Study Buddies
- Browse and discover study partners by subject, mode, and availability
- Send/accept buddy requests with personalized messages
- Track sessions together and hours studied

### 💬 Real-Time Chat
- Instant messaging with online/offline indicators
- Typing indicators and read receipts
- In-room group chat during study sessions

### 📊 Profiles & Stats
- Track study streaks, total hours, and session count
- Give/receive kudos (Great Explainer, Always On Time, etc.)
- View profile visitors and response times

### 🔔 Notifications
- Real-time push notifications for messages, invites, and requests
- Priority-based notification system (urgent, high, medium, low)
- Action links to jump directly to relevant pages

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router 6, Vite |
| **Backend** | Node.js, Express 4 |
| **Database** | PostgreSQL (with pg driver) |
| **Real-time** | Socket.IO |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Security** | Helmet, CORS, express-rate-limit |
| **Validation** | express-validator |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ 
- **PostgreSQL** 14+
- **npm** v9+

### One-Command Launch

```bash
# Production (clean DB)
bash start.sh

# Development (with 12 demo users, password: demo1234)
bash start.sh dev

# Restart only (keep existing data)
bash start.sh restart
```

> See [SETUP.md](SETUP.md) for detailed manual setup instructions.

---

## 📁 Project Structure

```
StudySync/
├── start.sh                    # One-command launch script
├── SETUP.md                    # Detailed setup guide
├── backend/
│   ├── .env                    # Environment variables
│   ├── package.json
│   └── src/
│       ├── server.js           # Express + Socket.IO server
│       ├── db.js               # PostgreSQL connection pool
│       ├── db/
│       │   ├── schema.sql      # Full database schema
│       │   ├── setup.js        # Idempotent DB setup
│       │   └── dev-seed.js     # Development seed data
│       ├── middleware/
│       │   └── auth.js         # JWT authentication
│       └── routes/
│           ├── auth.js         # Register / Login
│           ├── users.js        # Profile management
│           ├── buddies.js      # Study buddy system
│           ├── messages.js     # Chat messages
│           ├── sessions.js     # Study sessions
│           ├── notifications.js # Notification system
│           └── rooms.js        # Study rooms (4 permission levels)
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx             # Router & route definitions
│       ├── api.js              # Axios API client
│       ├── main.jsx            # React entry point
│       ├── index.css           # Global styles & design system
│       ├── context/
│       │   └── AuthContext.jsx # Auth state management
│       ├── components/
│       │   ├── RequireAuth.jsx # Route protection
│       │   └── BottomNav.jsx   # Mobile navigation
│       └── pages/
│           ├── Landing.jsx     # Public landing page
│           ├── Login.jsx       # Authentication
│           ├── Register.jsx
│           ├── Dashboard.jsx   # Home dashboard
│           ├── StudyRooms.jsx  # Browse & manage rooms
│           ├── CreateRoom.jsx  # Room creation wizard
│           ├── RoomLobby.jsx   # Pre-session lobby
│           ├── ActiveRoom.jsx  # Live study session
│           ├── JoinViaLink.jsx # Join room via shareable link
│           ├── RoomRequests.jsx # Manage join requests
│           └── ...             # Profile, Chat, Settings, etc.
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |

### Study Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Browse public rooms |
| GET | `/api/rooms/my` | My hosted/joined/invited rooms |
| GET | `/api/rooms/join/:token` | Lookup room by share link |
| POST | `/api/rooms` | Create a room |
| GET | `/api/rooms/:id` | Room detail + participants |
| POST | `/api/rooms/:id/join` | Join open/link room |
| POST | `/api/rooms/:id/start` | Host starts session |
| POST | `/api/rooms/:id/end` | Host ends session |
| POST | `/api/rooms/:id/request` | Request to join |
| POST | `/api/rooms/:id/invite` | Send invitations |
| PUT | `/api/rooms/:id` | Update room settings |
| POST | `/api/rooms/:id/leave` | Leave room |
| DELETE | `/api/rooms/:id/participants/:uid` | Remove participant |
| PUT | `/api/rooms/:id/cohost/:uid` | Make co-host |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/discover` | Browse potential buddies |
| POST | `/api/buddies` | Send buddy request |
| GET | `/api/messages/:userId` | Chat history |
| GET | `/api/notifications` | User notifications |
| GET | `/api/health` | Server health check |

---

## 🔐 Environment Variables

All env vars are in `backend/.env`:

```env
DATABASE_URL=postgresql://studysync:studysync123@localhost:5432/studysync
JWT_SECRET=studysync_jwt_super_secret_key_2026
PORT=4000
CLIENT_URL=http://localhost:5173
```

---

## 📡 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join` | Client → Server | Register user online |
| `send_message` | Client → Server | Send DM |
| `receive_message` | Server → Client | Receive DM |
| `room_join` | Client → Server | Join room channel |
| `room_leave` | Client → Server | Leave room channel |
| `room_message` | Both | In-room group chat |
| `room_request_new` | Server → Client | New join request (to host) |
| `room_request_approved` | Server → Client | Request approved (to user) |
| `room_kicked` | Server → Client | User removed from room |
| `room_ended` | Server → Client | Room ended by host |

---

## 🧪 Development

```bash
# Start in dev mode with demo data
bash start.sh dev

# Demo credentials (12 users available)
# Email: anjali@demo.com  Password: demo1234
# Email: rahul@demo.com   Password: demo1234
# ... (see dev-seed.js for full list)
```

---

## 📄 License

MIT
