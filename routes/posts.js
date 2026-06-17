const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Obtener posts (con filtros opcionales)
router.get('/', async (req, res) => {
  const { category } = req.query;
  try {
    let query = `
      SELECT p.*, u.name as user_name, u.avatar_url as user_avatar, u.city, u.neighborhood
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND p.category = $${params.length}`;
    }
    query += ' ORDER BY p.created_at DESC LIMIT 60';
    const result = await pool.query(query, params);
    res.json(result.rows);
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
