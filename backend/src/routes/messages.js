const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/messages/:partnerId
router.get('/:partnerId', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
       ORDER BY m.created_at ASC`,
            [req.user.id, req.params.partnerId]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/messages/:partnerId
router.post('/:partnerId', auth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'content required' });
        const r = await pool.query(
            `INSERT INTO messages (sender_id,receiver_id,content) VALUES ($1,$2,$3)
       RETURNING id,sender_id,receiver_id,content,created_at`,
            [req.user.id, req.params.partnerId, content]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
