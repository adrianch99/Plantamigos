require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/config', (req, res) => {
  res.json({
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || ''
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`PlantaMigos corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error iniciando servidor:', err);
    process.exit(1);
  }
}

start();
