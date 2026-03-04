const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
