const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/connections — my connections
router.get('/', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT c.*, u.name, u.avatar, u.subjects, u.rating, u.total_sessions
       FROM connections c
       JOIN users u ON u.id = CASE WHEN c.user_id=$1 THEN c.partner_id ELSE c.user_id END
       WHERE (c.user_id=$1 OR c.partner_id=$1) AND c.status='accepted'`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/connections/requests/received
router.get('/requests/received', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT c.*, u.name, u.avatar, u.subjects, u.goal, u.rating
       FROM connections c
       JOIN users u ON u.id = c.user_id
       WHERE c.partner_id=$1 AND c.status='pending'
       ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/connections/requests/sent
router.get('/requests/sent', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT c.*, u.name, u.avatar, u.subjects
       FROM connections c
       JOIN users u ON u.id = c.partner_id
       WHERE c.user_id=$1
       ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/connections — send request
router.post('/', auth, async (req, res) => {
    try {
        const { partnerId, subject, mode, scheduledWhen, duration, message } = req.body;
        if (!partnerId) return res.status(400).json({ error: 'partnerId required' });

        const existing = await pool.query(
            'SELECT id,status FROM connections WHERE user_id=$1 AND partner_id=$2',
            [req.user.id, partnerId]
        );
        if (existing.rows.length) return res.status(409).json({ error: 'Request already sent', status: existing.rows[0].status });

        const r = await pool.query(
            `INSERT INTO connections (user_id,partner_id,subject,mode,scheduled_when,duration,message)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.user.id, partnerId, subject || '', mode || 'discussion', scheduledWhen || 'Flexible', duration || '2 hours', message || '']
        );
        // Notify target
        await pool.query(
            `INSERT INTO notifications (user_id,icon,title,body) VALUES ($1,$2,$3,$4)`,
            [partnerId, '✉️', 'New Study Request!', `Someone wants to study ${subject || 'together'} with you.`]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/connections/:id/accept
router.put('/:id/accept', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE connections SET status='accepted' WHERE id=$1 AND partner_id=$2 RETURNING *`,
            [req.params.id, req.user.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Request not found' });
        // Notify requester
        const conn = r.rows[0];
        const me = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
        await pool.query(
            `INSERT INTO notifications (user_id,icon,title,body) VALUES ($1,$2,$3,$4)`,
            [conn.user_id, '✅', 'Request accepted!', `${me.rows[0]?.name} accepted your study request.`]
        );
        res.json(conn);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/connections/:id/decline
router.put('/:id/decline', auth, async (req, res) => {
    try {
        await pool.query(
            `UPDATE connections SET status='declined' WHERE id=$1 AND partner_id=$2`,
            [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
