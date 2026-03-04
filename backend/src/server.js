require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Socket.io — real-time chat
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
    });

    socket.on('send_message', async ({ receiverId, content, senderId, senderName, senderAvatar }) => {
        try {
            // Save to DB
            const r = await pool.query(
                'INSERT INTO messages (sender_id,receiver_id,content) VALUES ($1,$2,$3) RETURNING *',
                [senderId, receiverId, content]
            );
            const msg = { ...r.rows[0], sender_name: senderName, sender_avatar: senderAvatar };

            // Emit to receiver if online
            const receiverSocket = onlineUsers.get(receiverId);
            if (receiverSocket) io.to(receiverSocket).emit('receive_message', msg);

            // Ack sender
            socket.emit('message_sent', msg);
        } catch (e) {
            socket.emit('error', { message: e.message });
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) onlineUsers.delete(socket.userId);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 StudySync API running on http://localhost:${PORT}`));
