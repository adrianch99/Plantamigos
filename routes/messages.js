const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Conversaciones del usuario actual
router.get('/conversations', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id,
        u.name as other_name,
        u.avatar_url as other_avatar,
        last_msg.content as last_message,
        last_msg.created_at,
        last_msg.from_user,
        (SELECT COUNT(*) FROM messages WHERE to_user=$1 AND from_user=other_id AND read=FALSE) as unread
      FROM (
        SELECT CASE WHEN from_user=$1 THEN to_user ELSE from_user END as other_id
        FROM messages WHERE from_user=$1 OR to_user=$1
      ) conv
      JOIN users u ON u.id=other_id
      JOIN LATERAL (
        SELECT content, created_at, from_user FROM messages
        WHERE (from_user=$1 AND to_user=other_id) OR (from_user=other_id AND to_user=$1)
        ORDER BY created_at DESC LIMIT 1
      ) last_msg ON TRUE
      ORDER BY other_id, last_msg.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mensajes con un usuario
router.get('/:userId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, uf.name as from_name, uf.avatar_url as from_avatar
       FROM messages m
       JOIN users uf ON uf.id = m.from_user
       WHERE (m.from_user=$1 AND m.to_user=$2) OR (m.from_user=$2 AND m.to_user=$1)
       ORDER BY m.created_at ASC`,
      [req.user.id, req.params.userId]
    );
    await pool.query(
      'UPDATE messages SET read=TRUE WHERE from_user=$1 AND to_user=$2 AND read=FALSE',
      [req.params.userId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar mensaje
router.post('/', auth, async (req, res) => {
  const { to_user, content } = req.body;
  if (!to_user || !content) return res.status(400).json({ error: 'Destinatario y mensaje requeridos' });
  try {
    const result = await pool.query(
      'INSERT INTO messages (from_user, to_user, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, to_user, content]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conteo de no leídos
router.get('/unread/count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE to_user=$1 AND read=FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
