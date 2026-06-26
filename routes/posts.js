const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Obtener posts (con filtros opcionales)
router.get('/', async (req, res) => {
  const { category } = req.query;
  let userId = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      userId = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET).id;
    } catch {
      userId = null;
    }
  }
  try {
    const params = [];
    if (userId) params.push(userId);
    let query = `
      SELECT p.*, u.name as user_name, u.avatar_url as user_avatar, u.city, u.neighborhood,
        COALESCE(like_counts.count, 0) AS likes,
        COALESCE(comment_counts.count, 0) AS comments`
      + (userId ? ', CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END AS liked_by_user' : ', false AS liked_by_user') + `
      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS count FROM post_likes GROUP BY post_id
      ) AS like_counts ON like_counts.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS count FROM post_comments GROUP BY post_id
      ) AS comment_counts ON comment_counts.post_id = p.id
      ${userId ? 'LEFT JOIN post_likes user_likes ON user_likes.post_id = p.id AND user_likes.user_id = $1' : ''}
      WHERE 1=1
    `;
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND p.category = $${params.length}`;
    }
    query += ' ORDER BY p.created_at DESC LIMIT 60';
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      ...row,
      likedByUser: row.liked_by_user,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear post
router.post('/', auth, async (req, res) => {
  const { title, content, image_url, category, lat, lng } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es requerido' });
  try {
    // Get user location if not provided
    let postLat = lat, postLng = lng;
    if (!postLat) {
      const userResult = await pool.query('SELECT lat, lng FROM users WHERE id=$1', [req.user.id]);
      if (userResult.rows[0]) {
        postLat = userResult.rows[0].lat;
        postLng = userResult.rows[0].lng;
      }
    }
    const result = await pool.query(
      `INSERT INTO posts (user_id, title, content, image_url, category, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, title, content || '', image_url || '', category || 'intercambio', postLat, postLng]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener likes y comentarios de un post
router.get('/:id/interactions', async (req, res) => {
  try {
    const likesResult = await pool.query('SELECT COUNT(*) AS likes FROM post_likes WHERE post_id=$1', [req.params.id]);
    const userLiked = req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ?
      await pool.query('SELECT 1 FROM post_likes WHERE post_id=$1 AND user_id=$2', [req.params.id, jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET).id])
      .then(r => r.rowCount > 0).catch(() => false)
      : false;
    const commentsResult = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.name AS user_name, u.avatar_url AS user_avatar
       FROM post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ likes: parseInt(likesResult.rows[0].likes, 10), likedByUser: userLiked, comments: commentsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like / unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const postId = req.params.id;
    const existing = await pool.query('SELECT id FROM post_likes WHERE post_id=$1 AND user_id=$2', [postId, userId]);
    if (existing.rowCount > 0) {
      await pool.query('DELETE FROM post_likes WHERE id=$1', [existing.rows[0].id]);
      return res.json({ liked: false });
    }
    await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comentar post
router.post('/:id/comment', auth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  try {
    const result = await pool.query(
      `INSERT INTO post_comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at`,
      [req.user.id, req.params.id, content.trim()]
    );
    const comment = result.rows[0];
    const userResult = await pool.query('SELECT id, name, avatar_url FROM users WHERE id=$1', [req.user.id]);
    res.json({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user_id: userResult.rows[0].id,
      user_name: userResult.rows[0].name,
      user_avatar: userResult.rows[0].avatar_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar post
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM posts WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(403).json({ error: 'Sin permiso o post no existe' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
