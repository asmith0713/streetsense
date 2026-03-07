// server/utils/r2.js
// Cloudflare R2 utility for storing and retrieving images
// R2 is S3-compatible, so we use the AWS SDK

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Validate required env vars at startup
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'streetsense-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://images.yourdomain.com or https://pub-xxx.r2.dev

let s3Client = null;

function getClient() {
  if (s3Client) return s3Client;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn('⚠️  R2 credentials not configured. Image uploads will be disabled.');
    return null;
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  console.log('✅ Cloudflare R2 client initialized');
  return s3Client;
}

/**
 * Upload an image buffer to Cloudflare R2
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalName - Original filename
 * @param {string} mimetype - MIME type (image/jpeg, etc.)
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
async function uploadToR2(buffer, originalName, mimetype) {
  const client = getClient();
  if (!client) throw new Error('R2 not configured');

  // Generate unique filename: timestamp-random.ext
  const ext = path.extname(originalName) || '.jpg';
  const key = `reports/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));

  // Return the public URL
  // R2_PUBLIC_URL should be the public bucket URL (custom domain or r2.dev URL)
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;
  return publicUrl;
}

/**
 * Delete an image from R2 by its key
 * @param {string} imageUrl - The full public URL of the image
 */
async function deleteFromR2(imageUrl) {
  try {
    const client = getClient();
    if (!client) return;

    // Extract the key from the URL
    const url = new URL(imageUrl);
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

    await client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
  } catch (err) {
    console.error('R2 delete error:', err);
  }
}

/**
 * Check if R2 is configured and available
 */
function isR2Configured() {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

module.exports = { uploadToR2, deleteFromR2, isR2Configured };
