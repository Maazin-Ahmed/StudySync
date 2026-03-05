const router = require('express').Router();
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const auth = require('../middleware/auth');

// io instance injected by server.js after creation
let _io = null;
router.setIO = (io) => { _io = io; };

// emit to a specific user's socket (best-effort)
function emitToUser(userId, event, data) {
    if (!_io) return;
    // _io.userSockets is a Map<userId, socketId> set up in server.js
    const sid = _io.userSockets?.get(userId);
    if (sid) _io.to(sid).emit(event, data);
}

const ok = (req, res, next) => {
    const e = validationResult(req);
    if (!e.isEmpty()) {
        console.error('Validation errors:', JSON.stringify(e.array()));
        return res.status(400).json({ error: e.array()[0].msg });
    }
    next();
};

// helper: get room with participant count
async function enrichRoom(room, userId) {
    const pc = await pool.query(
        'SELECT COUNT(*) FROM room_participants WHERE room_id=$1 AND is_active=TRUE', [room.id]
    );
    const participant_count = parseInt(pc.rows[0].count);
    let my_role = null;
    if (userId) {
        const me = await pool.query(
            'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
            [room.id, userId]
        );
        if (me.rows.length) my_role = me.rows[0].role;
    }
    return { ...room, participant_count, my_role };
}

// helper: send notification
async function notify(userId, icon, title, body, category, priority, action_url) {
    await pool.query(
        `INSERT INTO notifications (user_id,icon,title,body,category,priority,action_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [userId, icon, title, body, category || 'room', priority || 'high', action_url]
    ).catch(() => { });
}

// ── GET /api/rooms — browse public open & request rooms ──────
router.get('/', auth, async (req, res) => {
    try {
        const { subject, mode, sort } = req.query;
        let whereExtra = '';
        const params = [];
        if (subject) { params.push(subject); whereExtra += ` AND sr.subject = $${params.length}`; }
        if (mode) { params.push(mode); whereExtra += ` AND sr.mode = $${params.length}`; }

        const orderBy = sort === 'size' ? 'participant_count DESC' :
            sort === 'new' ? 'sr.created_at DESC' :
                'CASE WHEN sr.status=\'active\' THEN 0 ELSE 1 END, sr.scheduled_at ASC';

        params.push(params.length + 1); // placeholder so slice works
        const q = `
      SELECT sr.*,
             u.name AS host_name, u.avatar AS host_avatar, u.rating AS host_rating,
             (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id=sr.id AND rp.is_active=TRUE) AS participant_count
      FROM study_rooms sr
      JOIN users u ON u.id = sr.host_id
      WHERE sr.permission IN ('open','request')
        AND sr.status IN ('lobby','active')
        AND sr.is_locked = FALSE
        AND u.status = 'active'
        ${whereExtra}
      ORDER BY ${orderBy}
      LIMIT 50`;
        const r = await pool.query(q.replace(`$${params.length}`, ''), params.slice(0, -1));
        res.json(r.rows);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch rooms' }); }
});

// ── GET /api/rooms/my — rooms I host, joined, or invited to ──
router.get('/my', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const [hosting, joined, invitations] = await Promise.all([
            pool.query(`
        SELECT sr.*, (SELECT COUNT(*) FROM room_participants WHERE room_id=sr.id AND is_active=TRUE) AS participant_count,
               (SELECT COUNT(*) FROM room_join_requests WHERE room_id=sr.id AND status='pending') AS pending_requests
        FROM study_rooms sr WHERE sr.host_id=$1 AND sr.status NOT IN ('ended','cancelled')
        ORDER BY sr.created_at DESC`, [userId]),
            pool.query(`
        SELECT sr.*, rp.role, rp.joined_at, u.name AS host_name, u.avatar AS host_avatar,
               (SELECT COUNT(*) FROM room_participants WHERE room_id=sr.id AND is_active=TRUE) AS participant_count
        FROM room_participants rp
        JOIN study_rooms sr ON sr.id = rp.room_id
        JOIN users u ON u.id = sr.host_id
        WHERE rp.user_id=$1 AND rp.is_active=TRUE AND sr.host_id <> $1 AND sr.status NOT IN ('ended','cancelled')
        ORDER BY rp.joined_at DESC`, [userId]),
            pool.query(`
        SELECT ri.*, sr.name AS room_name, sr.subject, sr.mode, sr.scheduled_at, sr.status AS room_status,
               u.name AS inviter_name, u.avatar AS inviter_avatar
        FROM room_invitations ri
        JOIN study_rooms sr ON sr.id = ri.room_id
        JOIN users u ON u.id = ri.inviter_id
        WHERE ri.invitee_id=$1 AND ri.status='pending' AND ri.expires_at > NOW()
        ORDER BY ri.created_at DESC`, [userId]),
        ]);
        res.json({ hosting: hosting.rows, joined: joined.rows, invitations: invitations.rows });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ── GET /api/rooms/:id — single room detail ───────────────────
router.get('/:id', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const { id } = req.params;
        const r = await pool.query(`
      SELECT sr.*, u.name AS host_name, u.avatar AS host_avatar, u.rating AS host_rating
      FROM study_rooms sr JOIN users u ON u.id=sr.host_id WHERE sr.id=$1`, [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Room not found' });
        const room = await enrichRoom(r.rows[0], req.user.id);
        // fetch participants
        const parts = await pool.query(`
      SELECT rp.role, rp.joined_at, u.id, u.name, u.avatar, u.rating, u.last_active_at
      FROM room_participants rp JOIN users u ON u.id=rp.user_id
      WHERE rp.room_id=$1 AND rp.is_active=TRUE ORDER BY rp.joined_at ASC`, [id]);
        res.json({ ...room, participants: parts.rows });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/rooms — create room ────────────────────────────
router.post('/',
    auth,
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Room name must be 3-100 chars'),
    body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
    body('mode').isIn(['silent', 'discussion', 'doubt']).withMessage('Invalid study mode'),
    body('permission').isIn(['open', 'link', 'request', 'private']).withMessage('Invalid permission type'),
    body('duration_hrs').optional().toFloat().isFloat({ min: 0.5, max: 12 }),
    body('capacity').optional({ nullable: true }).toInt().isInt({ min: 2, max: 200 }),
    ok,
    async (req, res) => {
        try {
            const { name, subject, topic, mode, permission, duration_hrs, capacity,
                auto_approve_buddies, auto_approve_min_rating, require_join_message,
                invite_buddies, invite_message, scheduled_at,
                link_expires_at, link_max_uses } = req.body;
            const hostId = req.user.id;

            // Generate link token if link-access room
            let link_token = null;
            if (permission === 'link') link_token = uuidv4().replace(/-/g, '').slice(0, 12);

            const r = await pool.query(
                `INSERT INTO study_rooms
           (host_id,name,subject,topic,mode,permission,duration_hrs,capacity,scheduled_at,
            link_token,link_expires_at,link_max_uses,auto_approve_buddies,auto_approve_min_rating,require_join_message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
                [hostId, name, subject || '', topic || '', mode, permission,
                    duration_hrs || 2, capacity || null, scheduled_at || new Date().toISOString(),
                    link_token, link_expires_at || null, link_max_uses || null,
                    !!auto_approve_buddies, auto_approve_min_rating || null, !!require_join_message]
            );
            const room = r.rows[0];

            // Host joins as host
            await pool.query(
                'INSERT INTO room_participants (room_id,user_id,role) VALUES ($1,$2,$3)',
                [room.id, hostId, 'host']
            );

            // Send invitations if private room
            if (permission === 'private' && Array.isArray(invite_buddies) && invite_buddies.length > 0) {
                const me = await pool.query('SELECT name FROM users WHERE id=$1', [hostId]);
                for (const inviteeId of invite_buddies.slice(0, 50)) {
                    try {
                        await pool.query(
                            `INSERT INTO room_invitations (room_id,inviter_id,invitee_id,message) VALUES ($1,$2,$3,$4)`,
                            [room.id, hostId, inviteeId, invite_message || '']
                        );
                        await notify(inviteeId, '🔒', `Invite from ${me.rows[0].name}`,
                            `${me.rows[0].name} invited you to "${name}" — ${subject || 'study session'}`,
                            'system', 'high', `/app/rooms/${room.id}`);
                    } catch (err) { /* skip dup */ }
                }
            }

            res.status(201).json({ ...room, link_url: link_token ? `/app/rooms/join/${link_token}` : null });
        } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create room' }); }
    }
);

// ── POST /api/rooms/:id/start — host starts session ──────────
router.post('/:id/start', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE study_rooms SET status='active', started_at=NOW()
       WHERE id=$1 AND host_id=$2 AND status='lobby' RETURNING *`,
            [req.params.id, req.user.id]
        );
        if (!r.rows.length) return res.status(403).json({ error: 'Not authorized or already started' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Failed to start room' }); }
});

// ── POST /api/rooms/:id/join — join open or link-access room ─
router.post('/:id/join', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const r = await pool.query('SELECT * FROM study_rooms WHERE id=$1', [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Room not found' });
        const room = r.rows[0];

        if (room.status === 'ended' || room.status === 'cancelled')
            return res.status(410).json({ error: 'Room has ended' });
        if (room.is_locked) return res.status(403).json({ error: 'Room is locked — no new joins' });
        if (!['open', 'link'].includes(room.permission))
            return res.status(403).json({ error: 'This room requires approval or invitation' });

        // capacity check
        const count = await pool.query('SELECT COUNT(*) FROM room_participants WHERE room_id=$1 AND is_active=TRUE', [id]);
        if (room.capacity && parseInt(count.rows[0].count) >= room.capacity)
            return res.status(409).json({ error: 'Room is at capacity' });

        // link-access: track uses
        if (room.permission === 'link') {
            if (room.link_max_uses && room.link_uses >= room.link_max_uses)
                return res.status(403).json({ error: 'This link has reached its maximum uses' });
            if (room.link_expires_at && new Date() > new Date(room.link_expires_at))
                return res.status(403).json({ error: 'This room link has expired' });
            await pool.query('UPDATE study_rooms SET link_uses=link_uses+1 WHERE id=$1', [id]);
        }

        await pool.query(
            `INSERT INTO room_participants (room_id,user_id,role) VALUES ($1,$2,'participant')
       ON CONFLICT (room_id,user_id) DO UPDATE SET is_active=TRUE, left_at=NULL, joined_at=NOW()`,
            [id, userId]
        );
        res.json({ ok: true, room_id: id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to join room' }); }
});

// ── GET /api/rooms/join/:token — join via shareable link ──────
// NOTE: This MUST stay before /:id routes so Express doesn't treat token as a UUID id
router.get('/join/:token', auth, async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT sr.*, u.name AS host_name, u.avatar AS host_avatar, u.rating AS host_rating,
             (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id=sr.id AND rp.is_active=TRUE) AS participant_count
       FROM study_rooms sr JOIN users u ON u.id=sr.host_id
       WHERE sr.link_token=$1 AND sr.permission='link'`, [req.params.token]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Invalid or expired link' });
        const room = r.rows[0];
        if (room.status === 'ended') return res.status(410).json({ error: 'This room has ended' });
        if (room.link_expires_at && new Date() > new Date(room.link_expires_at))
            return res.status(403).json({ error: 'Link has expired' });
        if (room.link_max_uses && room.link_uses >= room.link_max_uses)
            return res.status(403).json({ error: 'Link has reached max uses' });
        res.json(room);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── GET /api/rooms/:id/my-status — user's status in a room ───
router.get('/:id/my-status', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if participant
        const part = await pool.query(
            'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
            [id, userId]
        );
        if (part.rows.length) return res.json({ status: part.rows[0].role }); // host, co_host, participant

        // Check if invited
        const inv = await pool.query(
            `SELECT id FROM room_invitations WHERE room_id=$1 AND invitee_id=$2 AND status='pending' AND expires_at > NOW()`,
            [id, userId]
        );
        if (inv.rows.length) return res.json({ status: 'invited', invitation_id: inv.rows[0].id });

        // Check if pending request
        const req_r = await pool.query(
            `SELECT id, status FROM room_join_requests WHERE room_id=$1 AND user_id=$2`,
            [id, userId]
        );
        if (req_r.rows.length) return res.json({ status: req_r.rows[0].status === 'pending' ? 'requested' : req_r.rows[0].status });

        return res.json({ status: 'none' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/rooms/:id/request — request to join ────────────
router.post('/:id/request',
    auth,
    param('id').isUUID(),
    body('message').optional().isLength({ max: 200 }).trim(),
    ok,
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const r = await pool.query('SELECT * FROM study_rooms WHERE id=$1', [id]);
            if (!r.rows.length) return res.status(404).json({ error: 'Room not found' });
            const room = r.rows[0];
            if (room.permission !== 'request') return res.status(400).json({ error: 'This room does not require requests' });
            if (room.status === 'ended') return res.status(410).json({ error: 'Room has ended' });

            // auto-approve logic
            let autoApprove = false;
            if (room.auto_approve_buddies) {
                const isBuddy = await pool.query(
                    `SELECT id FROM study_buddies WHERE ((user_id=$1 AND buddy_id=$2) OR (user_id=$2 AND buddy_id=$1)) AND status='accepted'`,
                    [userId, room.host_id]
                );
                if (isBuddy.rows.length) autoApprove = true;
            }
            if (!autoApprove && room.auto_approve_min_rating) {
                const userRating = await pool.query('SELECT rating FROM users WHERE id=$1', [userId]);
                if (userRating.rows[0]?.rating >= room.auto_approve_min_rating) autoApprove = true;
            }

            const req_r = await pool.query(
                `INSERT INTO room_join_requests (room_id,user_id,message,status,reviewed_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (room_id,user_id) DO UPDATE SET message=$3, status=$4, reviewed_at=$5 RETURNING *`,
                [id, userId, req.body.message || '', autoApprove ? 'approved' : 'pending', autoApprove ? new Date() : null]
            );

            if (autoApprove) {
                await pool.query(
                    `INSERT INTO room_participants (room_id,user_id,role) VALUES ($1,$2,'participant')
           ON CONFLICT (room_id,user_id) DO UPDATE SET is_active=TRUE, left_at=NULL, joined_at=NOW()`,
                    [id, userId]
                );
                return res.json({ status: 'approved', auto: true });
            }

            // notify host via DB notification + real-time socket
            const me = await pool.query('SELECT name FROM users WHERE id=$1', [userId]);
            await notify(room.host_id, '🚪', 'New join request!',
                `${me.rows[0].name} wants to join "${room.name}"`,
                'system', 'high', `/app/rooms/${id}/requests`);

            // Real-time: push to host's socket
            emitToUser(room.host_id, 'room_request_new', {
                roomId: id,
                request: { ...req_r.rows[0], name: me.rows[0].name }
            });

            res.status(201).json({ status: 'pending' });
        } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send request' }); }
    }
);

// ── GET /api/rooms/:id/requests — host views pending requests ─
router.get('/:id/requests', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const room = await pool.query('SELECT host_id FROM study_rooms WHERE id=$1', [req.params.id]);
        if (!room.rows.length) return res.status(404).json({ error: 'Room not found' });
        // allow host + co-host
        const coh = await pool.query(
            'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
            [req.params.id, req.user.id]
        );
        const role = coh.rows[0]?.role;
        if (!['host', 'co_host'].includes(role)) return res.status(403).json({ error: 'Not authorized' });

        const r = await pool.query(`
      SELECT rjr.*, u.name, u.avatar, u.rating, u.subjects, u.institution, u.total_sessions
      FROM room_join_requests rjr JOIN users u ON u.id=rjr.user_id
      WHERE rjr.room_id=$1 AND rjr.status='pending'
      ORDER BY rjr.created_at ASC`, [req.params.id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── PUT /api/rooms/requests/:reqId/approve ────────────────────
router.put('/requests/:reqId/approve', auth, param('reqId').isUUID(), ok, async (req, res) => {
    try {
        const rjr = await pool.query('SELECT * FROM room_join_requests WHERE id=$1', [req.params.reqId]);
        if (!rjr.rows.length) return res.status(404).json({ error: 'Request not found' });
        const { room_id, user_id } = rjr.rows[0];
        const coh = await pool.query(
            'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
            [room_id, req.user.id]
        );
        if (!['host', 'co_host'].includes(coh.rows[0]?.role))
            return res.status(403).json({ error: 'Not authorized' });

        await pool.query(
            `UPDATE room_join_requests SET status='approved', reviewed_at=NOW() WHERE id=$1`, [req.params.reqId]
        );
        await pool.query(
            `INSERT INTO room_participants (room_id,user_id,role) VALUES ($1,$2,'participant')
       ON CONFLICT (room_id,user_id) DO UPDATE SET is_active=TRUE, left_at=NULL, joined_at=NOW()`,
            [room_id, user_id]
        );
        const roomName = await pool.query('SELECT name FROM study_rooms WHERE id=$1', [room_id]);
        await notify(user_id, '✅', 'Join request approved!',
            `You can now join "${roomName.rows[0]?.name}"`,
            'system', 'urgent', `/app/rooms/${room_id}/lobby`);

        // Real-time: notify requester
        emitToUser(user_id, 'room_request_approved', {
            roomId: room_id,
            roomName: roomName.rows[0]?.name
        });

        res.json({ ok: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ── PUT /api/rooms/requests/:reqId/deny ──────────────────────
router.put('/requests/:reqId/deny', auth, param('reqId').isUUID(), ok, async (req, res) => {
    try {
        const rjr = await pool.query('SELECT * FROM room_join_requests WHERE id=$1', [req.params.reqId]);
        if (!rjr.rows.length) return res.status(404).json({ error: 'Not found' });
        const { room_id, user_id } = rjr.rows[0];
        const coh = await pool.query(
            'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
            [room_id, req.user.id]
        );
        if (!['host', 'co_host'].includes(coh.rows[0]?.role)) return res.status(403).json({ error: 'Not authorized' });
        await pool.query(`UPDATE room_join_requests SET status='denied', reviewed_at=NOW() WHERE id=$1`, [req.params.reqId]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/rooms/:id/invite — send invitations ────────────
router.post('/:id/invite',
    auth,
    param('id').isUUID(),
    body('invitees').isArray({ min: 1, max: 50 }),
    body('message').optional().isLength({ max: 300 }).trim(),
    ok,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { invitees, message } = req.body;
            const coh = await pool.query(
                'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
                [id, req.user.id]
            );
            if (!coh.rows.length) return res.status(403).json({ error: 'You are not in this room' });
            const room = await pool.query('SELECT name,subject FROM study_rooms WHERE id=$1', [id]);
            const me = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
            let sent = 0;
            for (const inviteeId of invitees) {
                try {
                    await pool.query(
                        `INSERT INTO room_invitations (room_id,inviter_id,invitee_id,message)
             VALUES ($1,$2,$3,$4) ON CONFLICT (room_id,invitee_id) DO NOTHING`,
                        [id, req.user.id, inviteeId, message || '']
                    );
                    await notify(inviteeId, '📨', `${me.rows[0].name} invited you to study`,
                        `Join "${room.rows[0].name}"${room.rows[0].subject ? ' — ' + room.rows[0].subject : ''}`,
                        'system', 'high', `/app/rooms/${id}`);
                    sent++;
                } catch (_) { }
            }
            res.json({ sent });
        } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to send invitations' }); }
    }
);

// ── PUT /api/rooms/invitations/:invId/accept ─────────────────
router.put('/invitations/:invId/accept', auth, param('invId').isUUID(), ok, async (req, res) => {
    try {
        const inv = await pool.query('SELECT * FROM room_invitations WHERE id=$1', [req.params.invId]);
        if (!inv.rows.length) return res.status(404).json({ error: 'Invitation not found' });
        const { room_id, invitee_id, inviter_id } = inv.rows[0];
        if (invitee_id !== req.user.id) return res.status(403).json({ error: 'Not your invitation' });
        if (inv.rows[0].status !== 'pending') return res.status(400).json({ error: 'Invitation already responded to' });
        if (new Date() > new Date(inv.rows[0].expires_at)) return res.status(410).json({ error: 'Invitation expired' });

        await pool.query(`UPDATE room_invitations SET status='accepted' WHERE id=$1`, [req.params.invId]);
        await pool.query(
            `INSERT INTO room_participants (room_id,user_id,role) VALUES ($1,$2,'participant')
       ON CONFLICT (room_id,user_id) DO UPDATE SET is_active=TRUE, left_at=NULL, joined_at=NOW()`,
            [room_id, req.user.id]
        );
        const me = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
        const rm = await pool.query('SELECT name FROM study_rooms WHERE id=$1', [room_id]);
        await notify(inviter_id, '🎉', `${me.rows[0].name} accepted your invitation`,
            `They joined "${rm.rows[0].name}"`, 'system', 'medium', `/app/rooms/${room_id}`);
        res.json({ ok: true, room_id });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// ── PUT /api/rooms/invitations/:invId/decline ────────────────
router.put('/invitations/:invId/decline', auth, param('invId').isUUID(), ok, async (req, res) => {
    try {
        const inv = await pool.query(`SELECT invitee_id FROM room_invitations WHERE id=$1`, [req.params.invId]);
        if (!inv.rows.length || inv.rows[0].invitee_id !== req.user.id)
            return res.status(403).json({ error: 'Not found' });
        await pool.query(`UPDATE room_invitations SET status='declined' WHERE id=$1`, [req.params.invId]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/rooms/:id/leave — leave room ────────────────────
router.post('/:id/leave', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        await pool.query(
            `UPDATE room_participants SET is_active=FALSE, left_at=NOW()
       WHERE room_id=$1 AND user_id=$2`, [req.params.id, req.user.id]
        );
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── DELETE /api/rooms/:id/participants/:uid — host removes ────
router.delete('/:id/participants/:uid',
    auth, param('id').isUUID(), param('uid').isUUID(), ok,
    async (req, res) => {
        try {
            const { id, uid } = req.params;
            const coh = await pool.query(
                'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
                [id, req.user.id]
            );
            if (!['host', 'co_host'].includes(coh.rows[0]?.role)) return res.status(403).json({ error: 'Not authorized' });
            if (uid === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
            await pool.query(
                `UPDATE room_participants SET is_active=FALSE, left_at=NOW() WHERE room_id=$1 AND user_id=$2`,
                [id, uid]
            );
            const rm = await pool.query('SELECT name FROM study_rooms WHERE id=$1', [id]);
            await notify(uid, '⚠️', 'Removed from study room',
                `You were removed from "${rm.rows[0]?.name}" by the host.`, 'system', 'medium', '/app/rooms');
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Failed' }); }
    }
);

// ── PUT /api/rooms/:id/cohost/:uid — make co-host ─────────────
router.put('/:id/cohost/:uid',
    auth, param('id').isUUID(), param('uid').isUUID(), ok,
    async (req, res) => {
        try {
            const { id, uid } = req.params;
            const isHost = await pool.query(
                `SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND role='host' AND is_active=TRUE`,
                [id, req.user.id]
            );
            if (!isHost.rows.length) return res.status(403).json({ error: 'Only host can assign co-host' });
            await pool.query(
                `UPDATE room_participants SET role='co_host' WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE`,
                [id, uid]
            );
            const rm = await pool.query('SELECT name FROM study_rooms WHERE id=$1', [id]);
            await notify(uid, '👑', 'You are now a co-host!',
                `You can now help manage "${rm.rows[0]?.name}"`, 'system', 'medium', `/app/rooms/${id}`);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Failed' }); }
    }
);

// ── PUT /api/rooms/:id — update room settings ─────────────────
router.put('/:id',
    auth,
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 3, max: 100 }),
    body('permission').optional().isIn(['open', 'link', 'request', 'private']),
    body('is_locked').optional().isBoolean(),
    body('capacity').optional().isInt({ min: 2, max: 200 }),
    ok,
    async (req, res) => {
        try {
            const { id } = req.params;
            const coh = await pool.query(
                'SELECT role FROM room_participants WHERE room_id=$1 AND user_id=$2 AND is_active=TRUE',
                [id, req.user.id]
            );
            if (!['host', 'co_host'].includes(coh.rows[0]?.role)) return res.status(403).json({ error: 'Not authorized' });
            const allowed = ['name', 'permission', 'is_locked', 'capacity', 'topic', 'duration_hrs'];
            const sets = []; const vals = [];
            for (const k of allowed) {
                if (req.body[k] !== undefined) { vals.push(req.body[k]); sets.push(`${k}=$${vals.length}`); }
            }
            if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
            vals.push(id);
            const r = await pool.query(
                `UPDATE study_rooms SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING *`, vals
            );
            res.json(r.rows[0]);
        } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update room' }); }
    }
);

// ── POST /api/rooms/:id/end — host ends session ───────────────
router.post('/:id/end', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE study_rooms SET status='ended', ended_at=NOW()
       WHERE id=$1 AND host_id=$2 AND status IN ('lobby','active') RETURNING *`,
            [req.params.id, req.user.id]
        );
        if (!r.rows.length) return res.status(403).json({ error: 'Not found or already ended' });
        // Mark all participants as left
        await pool.query(
            `UPDATE room_participants SET is_active=FALSE, left_at=NOW() WHERE room_id=$1`, [req.params.id]
        );
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ── POST /api/rooms/:id/regenerate-link — new link token ──────
router.post('/:id/regenerate-link', auth, param('id').isUUID(), ok, async (req, res) => {
    try {
        const r = await pool.query(
            `UPDATE study_rooms SET link_token=$1, link_uses=0
       WHERE id=$2 AND host_id=$3 AND permission='link' RETURNING link_token`,
            [uuidv4().replace(/-/g, '').slice(0, 12), req.params.id, req.user.id]
        );
        if (!r.rows.length) return res.status(403).json({ error: 'Not authorized' });
        res.json({ link_token: r.rows[0].link_token, link_url: `/app/rooms/join/${r.rows[0].link_token}` });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
