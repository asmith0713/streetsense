// server/routes/images.js
// Serves images stored in MongoDB GridFS
const express = require('express');
const router = express.Router();
const { streamFromGridFS } = require('../utils/gridfs');

// GET /api/images/:id - Serve image from GridFS
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    await streamFromGridFS(id, res);
  } catch (err) {
    console.error('GET /api/images/:id error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve image' });
    }
  }
});

module.exports = router;
