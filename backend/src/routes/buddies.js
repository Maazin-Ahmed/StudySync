const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    next();
};

// GET /api/buddies — my accepted study buddies
router.get('/', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT sb.id, sb.user_id, sb.buddy_id, sb.status, sb.subject, sb.mode,
              sb.sessions_together, sb.hours_together, sb.last_session_at, sb.created_at,
              u.name, u.avatar, u.subjects, u.rating, u.total_sessions, u.institution, u.last_active_at
       FROM study_buddies sb
       JOIN users u ON u.id = CASE WHEN sb.user_id=$1 THEN sb.buddy_id ELSE sb.user_id END
       WHERE (sb.user_id=$1 OR sb.buddy_id=$1) AND sb.status='accepted'
         AND u.status='active'
       ORDER BY sb.last_session_at DESC NULLS LAST, sb.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch study buddies' }); }
});

// GET /api/buddies/requests/received
router.get('/requests/received', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT sb.*, u.name, u.avatar, u.subjects, u.goal, u.rating, u.institution
       FROM study_buddies sb
       JOIN users u ON u.id = sb.user_id
       WHERE sb.buddy_id=$1 AND sb.status='pending' AND u.status='active'
       ORDER BY sb.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch requests' }); }
});

// GET /api/buddies/requests/sent
router.get('/requests/sent', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT sb.*, u.name, u.avatar, u.subjects, u.institution
       FROM study_buddies sb
       JOIN users u ON u.id = sb.buddy_id
       WHERE sb.user_id=$1 AND u.status='active'
       ORDER BY sb.created_at DESC`,
            [req.user.id]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: 'Failed to fetch sent requests' }); }
});

// POST /api/buddies — send request
router.post('/',
    auth,
    body('buddyId').isUUID().withMessage('Invalid buddy ID'),
    body('subject').optional().isLength({ max: 100 }).trim(),
    body('message').optional().isLength({ max: 500 }).trim(),
    body('mode').optional().isIn(['silent', 'discussion', 'doubt']),
    validate,
    async (req, res) => {
        try {
            const { buddyId, subject, mode, scheduledWhen, duration, message } = req.body;
            if (buddyId === req.user.id) return res.status(400).json({ error: 'Cannot send request to yourself' });

            const target = await pool.query('SELECT id FROM users WHERE id=$1 AND status=$2', [buddyId, 'active']);
            if (!target.rows.length) return res.status(404).json({ error: 'User not found' });

            const existing = await pool.query(
                'SELECT id, status FROM study_buddies WHERE (user_id=$1 AND buddy_id=$2) OR (user_id=$2 AND buddy_id=$1)',
                [req.user.id, buddyId]
            );
            if (existing.rows.length) return res.status(409).json({ error: 'Request already exists', status: existing.rows[0].status });

            const r = await pool.query(
                `INSERT INTO study_buddies (user_id,buddy_id,subject,mode,scheduled_when,duration,message)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
                [req.user.id, buddyId, subject || '', mode || 'discussion', scheduledWhen || 'Flexible', duration || '2 hours', message || '']
            );
            const me = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
            await pool.query(
                `INSERT INTO notifications (user_id,icon,title,body,category,priority,action_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [buddyId, '✉️', 'New Study Buddy Request!',
                    `${me.rows[0].name} wants to be your study buddy${subject ? ' for ' + subject : ''}.`,
                    'request', 'high', '/app/requests']
            );
            res.status(201).json(r.rows[0]);
        } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send request' }); }
    }
);

// PUT /api/buddies/:id/accept
router.put('/:id/accept',
    auth,
    param('id').isUUID(),
    validate,
    async (req, res) => {
        try {
            const r = await pool.query(
                `UPDATE study_buddies SET status='accepted' WHERE id=$1 AND buddy_id=$2 AND status='pending' RETURNING *`,
                [req.params.id, req.user.id]
            );
            if (!r.rows.length) return res.status(404).json({ error: 'Request not found' });
            const conn = r.rows[0];
            const me = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
            await pool.query(
                `INSERT INTO notifications (user_id,icon,title,body,category,priority,action_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [conn.user_id, '🎉', 'Study Buddy Request Accepted!',
                `${me.rows[0].name} accepted your study buddy request. Start chatting now!`,
                    'request', 'high', `/app/chats/${req.user.id}`]
            );
            res.json(conn);
        } catch (e) { res.status(500).json({ error: 'Failed to accept request' }); }
    }
);

// PUT /api/buddies/:id/decline
router.put('/:id/decline',
    auth,
    param('id').isUUID(),
    validate,
    async (req, res) => {
        try {
            const r = await pool.query(
                `UPDATE study_buddies SET status='declined' WHERE id=$1 AND buddy_id=$2 AND status='pending'`,
                [req.params.id, req.user.id]
            );
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Failed to decline request' }); }
    }
);

// DELETE /api/buddies/:id — remove study buddy
router.delete('/:id',
    auth,
    param('id').isUUID(),
    validate,
    async (req, res) => {
        try {
            await pool.query(
                `UPDATE study_buddies SET status='archived'
         WHERE id=$1 AND (user_id=$2 OR buddy_id=$2)`,
                [req.params.id, req.user.id]
            );
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Failed to remove study buddy' }); }
    }
);

// GET /api/buddies/check/:buddyId — check relationship status
router.get('/check/:buddyId',
    auth,
    param('buddyId').isUUID(),
    validate,
    async (req, res) => {
        try {
            const r = await pool.query(
                `SELECT id, status, user_id, buddy_id FROM study_buddies
         WHERE (user_id=$1 AND buddy_id=$2) OR (user_id=$2 AND buddy_id=$1)
         LIMIT 1`,
                [req.user.id, req.params.buddyId]
            );
            if (!r.rows.length) return res.json({ status: 'none' });
            const row = r.rows[0];
            res.json({
                status: row.status,
                requestId: row.id,
                isSender: row.user_id === req.user.id
            });
        } catch (e) { res.status(500).json({ error: 'Failed to check status' }); }
    }
);

module.exports = router;
