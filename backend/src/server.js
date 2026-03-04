require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});

// ─── Security headers ─────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '50kb' }));

// ─── Rate limiting ───────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 120,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/buddies', require('./routes/buddies'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now(), env: process.env.NODE_ENV || 'development' }));

// ─── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── 404 handler ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ─── Socket.io — real-time chat ──────────────────────────────
const onlineUsers = new Map(); // userId → socketId

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        if (!userId) return;
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        // Update last_active_at
        pool.query('UPDATE users SET last_active_at=NOW() WHERE id=$1', [userId]).catch(() => { });
    });

    socket.on('send_message', async ({ receiverId, content, senderId, senderName, senderAvatar }) => {
        if (!content || !receiverId || !senderId || content.length > 2000) return;
        try {
            const r = await pool.query(
                'INSERT INTO messages (sender_id,receiver_id,content) VALUES ($1,$2,$3) RETURNING *',
                [senderId, receiverId, content.trim()]
            );
            const msg = { ...r.rows[0], sender_name: senderName, sender_avatar: senderAvatar };
            const receiverSocket = onlineUsers.get(receiverId);
            if (receiverSocket) {
                io.to(receiverSocket).emit('receive_message', msg);
            } else {
                // Notify offline user
                pool.query(
                    `INSERT INTO notifications (user_id,icon,title,body,category,priority,action_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [receiverId, '💬', `Message from ${senderName}`,
                        content.length > 80 ? content.slice(0, 77) + '...' : content,
                        'message', 'high', `/app/chats/${senderId}`]
                ).catch(() => { });
            }
            socket.emit('message_sent', msg);
        } catch (e) {
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('typing', ({ receiverId, isTyping }) => {
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) io.to(receiverSocket).emit('partner_typing', { senderId: socket.userId, isTyping });
    });

    socket.on('mark_read', async ({ senderId }) => {
        if (!senderId || !socket.userId) return;
        await pool.query(
            'UPDATE messages SET is_read=TRUE WHERE sender_id=$1 AND receiver_id=$2 AND is_read=FALSE',
            [senderId, socket.userId]
        ).catch(() => { });
        const senderSocket = onlineUsers.get(senderId);
        if (senderSocket) io.to(senderSocket).emit('messages_read', { by: socket.userId });
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            pool.query('UPDATE users SET last_active_at=NOW() WHERE id=$1', [socket.userId]).catch(() => { });
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`\n🚀 StudySync API running on http://localhost:${PORT}`);
    console.log(`   Security: helmet ✓  rate-limit ✓  CORS → ${CLIENT_URL}`);
    console.log(`   Socket.io: real-time chat enabled\n`);
});
