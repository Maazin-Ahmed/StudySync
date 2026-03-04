const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

function signToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, subjects, goal, availability, modes, avatar } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });

        const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 10);
        const avatars = ['👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🎓', '🎓', '🧠', '📖', '🚀', '⚡', '🌟'];
        const av = avatar || avatars[Math.floor(Math.random() * avatars.length)];

        const result = await pool.query(
            `INSERT INTO users (name,email,password_hash,avatar,subjects,goal,availability,modes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,avatar,subjects,goal,availability,modes,institution,education,bio,rating,total_sessions,streak`,
            [name, email, hash, av, JSON.stringify(subjects || []), goal || '', JSON.stringify(availability || []), JSON.stringify(modes || [])]
        );
        const user = result.rows[0];
        res.json({ token: signToken(user), user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const result = await pool.query(
            'SELECT id,name,email,password_hash,avatar,subjects,goal,availability,modes,institution,education,bio,rating,total_sessions,streak FROM users WHERE email=$1',
            [email]
        );
        if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        delete user.password_hash;
        res.json({ token: signToken(user), user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
