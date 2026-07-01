const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Todos los usuarios con ubicación (para el mapa)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.avatar_url, u.bio, u.lat, u.lng, u.city, u.neighborhood, u.street,
             COUNT(DISTINCT p.id) as plant_count
      FROM users u
      LEFT JOIN user_plants p ON p.user_id = u.id
      WHERE u.lat IS NOT NULL AND u.lng IS NOT NULL
      GROUP BY u.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Perfil de usuario por id
router.get('/:id', async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, name, email, bio, avatar_url, lat, lng, city, neighborhood, street, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });

    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        userId = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET).id;
      } catch {
        userId = null;
      }
    }

    const plants = await pool.query(
      'SELECT * FROM user_plants WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    const posts = await pool.query(
      `SELECT p.*, u.name as user_name, u.avatar_url as user_avatar, u.city, u.neighborhood,
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
       ${userId ? 'LEFT JOIN post_likes user_likes ON user_likes.post_id = p.id AND user_likes.user_id = $2' : ''}
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC LIMIT 20`,
      userId ? [req.params.id, userId] : [req.params.id]
    );
    res.json({ ...user.rows[0], plants: plants.rows, posts: posts.rows.map(row => ({ ...row, likedByUser: row.liked_by_user })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar perfil
router.put('/:id', auth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Sin permiso' });
  }
  const { name, bio, avatar_url, lat, lng, city, neighborhood, street } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET name=$1, bio=$2, avatar_url=$3, lat=$4, lng=$5, city=$6, neighborhood=$7, street=$8
       WHERE id=$9 RETURNING id, name, bio, avatar_url, lat, lng, city, neighborhood, street`,
      [name, bio, avatar_url, lat, lng, city, neighborhood, street, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar planta
router.post('/:id/plants', auth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Sin permiso' });
  }
  const { name, description, image_url, type, exchange_type } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO user_plants (user_id, name, description, image_url, type, exchange_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, name, description || '', image_url || '', type || 'offer', exchange_type || 'intercambio']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar planta
router.delete('/:userId/plants/:plantId', auth, async (req, res) => {
  if (req.user.id !== parseInt(req.params.userId)) {
    return res.status(403).json({ error: 'Sin permiso' });
  }
  try {
    await pool.query('DELETE FROM user_plants WHERE id=$1 AND user_id=$2', [req.params.plantId, req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
