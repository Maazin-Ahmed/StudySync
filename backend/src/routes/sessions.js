const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/sessions
router.get('/', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT s.*, u.name as partner_name, u.avatar as partner_avatar
       FROM sessions s
       LEFT JOIN users u ON u.id = CASE WHEN s.creator_id=$1 THEN s.partner_id ELSE s.creator_id END
       WHERE (s.creator_id=$1 OR s.partner_id=$1) AND s.status<>'completed'
       ORDER BY s.scheduled_at ASC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/sessions
router.post('/', auth, async (req, res) => {
    try {
        const { partnerId, subject, topic, mode, durationHrs, scheduledAt } = req.body;
        const r = await pool.query(
            `INSERT INTO sessions (creator_id,partner_id,subject,topic,mode,duration_hrs,scheduled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.user.id, partnerId || null, subject || '', topic || '', mode || 'silent', durationHrs || 1, scheduledAt || new Date()]
        );
        if (partnerId) {
            await pool.query(
                `INSERT INTO notifications (user_id,icon,title,body) VALUES ($1,$2,$3,$4)`,
                [partnerId, '📅', 'Session Scheduled!', `You have a new ${subject} session.`]
            );
        }
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/sessions/:id/complete
router.put('/:id/complete', auth, async (req, res) => {
    try {
        const { rating, notes } = req.body;
        const r = await pool.query(
            `UPDATE sessions SET status='completed' WHERE id=$1 AND (creator_id=$2 OR partner_id=$2) RETURNING *`,
            [req.params.id, req.user.id]
        );
        // increment stats
        await pool.query(
            `UPDATE users SET total_sessions=total_sessions+1, streak=streak+1 WHERE id=$1`,
            [req.user.id]
        );
        res.json(r.rows[0] || { ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/sessions/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM sessions WHERE id=$1 AND creator_id=$2', [req.params.id, req.user.id]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
