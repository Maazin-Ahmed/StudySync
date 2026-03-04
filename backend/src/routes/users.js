const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT id,name,email,avatar,subjects,goal,availability,modes,institution,education,bio,rating,total_sessions,streak FROM users WHERE id=$1',
            [req.user.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/me
router.put('/me', auth, async (req, res) => {
    try {
        const { name, institution, education, bio, subjects, goal, availability, modes, avatar } = req.body;
        const r = await pool.query(
            `UPDATE users SET
        name=COALESCE($1,name), institution=COALESCE($2,institution), education=COALESCE($3,education),
        bio=COALESCE($4,bio), subjects=COALESCE($5,subjects), goal=COALESCE($6,goal),
        availability=COALESCE($7,availability), modes=COALESCE($8,modes), avatar=COALESCE($9,avatar)
       WHERE id=$10
       RETURNING id,name,email,avatar,subjects,goal,availability,modes,institution,education,bio,rating,total_sessions,streak`,
            [name, institution, education, bio,
                subjects ? JSON.stringify(subjects) : null,
                goal,
                availability ? JSON.stringify(availability) : null,
                modes ? JSON.stringify(modes) : null,
                avatar, req.user.id]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/search?subject=&mode=&goal=
router.get('/search', auth, async (req, res) => {
    try {
        const { subject, mode } = req.query;
        let q = `SELECT id,name,email,avatar,subjects,goal,availability,modes,institution,education,bio,rating,total_sessions
             FROM users WHERE id<>$1`;
        const params = [req.user.id];
        if (subject) { q += ` AND subjects::text ILIKE $${params.length + 1}`; params.push(`%${subject}%`); }
        q += ' ORDER BY rating DESC LIMIT 50';
        const r = await pool.query(q, params);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT id,name,email,avatar,subjects,goal,availability,modes,institution,education,bio,rating,total_sessions FROM users WHERE id=$1',
            [req.params.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
