// server/utils/gridfs.js
// GridFS utility for storing and retrieving images in MongoDB

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

let bucket;

/**
 * Get or create the GridFS bucket (lazy init after Mongoose connects)
 */
function getBucket() {
  if (bucket) return bucket;
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB not connected — cannot init GridFS');
  bucket = new GridFSBucket(db, { bucketName: 'images' });
  return bucket;
}

/**
 * Upload a buffer to GridFS
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} filename - Original filename
 * @param {string} mimetype - MIME type (image/jpeg, etc.)
 * @returns {Promise<string>} - The GridFS file ID as a string
 */
function uploadToGridFS(buffer, filename, mimetype) {
  return new Promise((resolve, reject) => {
    const b = getBucket();
    const readStream = Readable.from(buffer);
    const uploadStream = b.openUploadStream(filename, {
      contentType: mimetype,
      metadata: { uploadedAt: new Date() }
    });

    readStream.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id.toString()));
  });
}

/**
 * Stream a file from GridFS into an Express response
 * @param {string} fileId - GridFS ObjectId as string
 * @param {import('express').Response} res - Express response
 */
async function streamFromGridFS(fileId, res) {
  const b = getBucket();
  const _id = new mongoose.Types.ObjectId(fileId);

  // Look up file metadata first
  const files = await b.find({ _id }).toArray();
  if (!files || files.length === 0) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const file = files[0];
  res.set('Content-Type', file.contentType || 'application/octet-stream');
  res.set('Content-Length', file.length);
  res.set('Cache-Control', 'public, max-age=86400'); // 1 day
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('Access-Control-Allow-Origin', '*');

  const downloadStream = b.openDownloadStream(_id);
  downloadStream.pipe(res);
  downloadStream.on('error', (err) => {
    console.error('GridFS download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream image' });
    }
  });
}

/**
 * Delete a file from GridFS
 * @param {string} fileId - GridFS ObjectId as string
 */
async function deleteFromGridFS(fileId) {
  try {
    const b = getBucket();
    await b.delete(new mongoose.Types.ObjectId(fileId));
  } catch (err) {
    console.error('GridFS delete error:', err);
  }
}

module.exports = { uploadToGridFS, streamFromGridFS, deleteFromGridFS, getBucket };
