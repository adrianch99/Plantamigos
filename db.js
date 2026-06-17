const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        city VARCHAR(100) DEFAULT '',
        neighborhood VARCHAR(100) DEFAULT '',
        street VARCHAR(150) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_plants (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        type VARCHAR(20) DEFAULT 'offer' CHECK (type IN ('offer','want','tip')),
        exchange_type VARCHAR(20) DEFAULT 'intercambio' CHECK (exchange_type IN ('intercambio','regalo','donacion')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        category VARCHAR(30) DEFAULT 'intercambio' CHECK (category IN ('intercambio','regalo','donacion','tip','pregunta')),
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user INT REFERENCES users(id) ON DELETE CASCADE,
        to_user INT REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Base de datos inicializada correctamente');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
