// server/utils/stripMetadata.js
//
// Photos attached to reports are published on a public bucket, and phone
// cameras embed GPS coordinates, capture time and device identifiers in the
// file. Reports are meant to be anonymous, so metadata is removed before
// upload. Done by hand rather than with an image library so no native
// dependency is needed: the pixel data is untouched, only metadata segments
// and chunks are dropped.

const JPEG_SOI = 0xd8;
const JPEG_SOS = 0xda;
const JPEG_EOI = 0xd9;

// APP1 holds EXIF/XMP, APP2 holds ICC/FlashPix, APP13 holds IPTC, COM is a
// free-text comment. APP0 (JFIF) is kept because decoders expect it.
function isMetadataMarker(marker) {
  if (marker === 0xfe) return true;                 // COM
  if (marker >= 0xe1 && marker <= 0xef) return true; // APP1..APP15
  return false;
}

function stripJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== JPEG_SOI) return buffer;

  const chunks = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) break; // not a marker boundary; bail out safely

    const marker = buffer[offset + 1];

    if (marker === JPEG_EOI) {
      chunks.push(buffer.subarray(offset));
      offset = buffer.length;
      break;
    }

    if (marker === JPEG_SOS) {
      // Start of compressed data - copy the remainder verbatim.
      chunks.push(buffer.subarray(offset));
      offset = buffer.length;
      break;
    }

    if (offset + 4 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) break;

    if (!isMetadataMarker(marker)) {
      chunks.push(buffer.subarray(offset, offset + 2 + segmentLength));
    }

    offset += 2 + segmentLength;
  }

  return offset >= buffer.length ? Buffer.concat(chunks) : buffer;
}

// Chunks a PNG decoder needs. Everything else (tEXt, iTXt, eXIf, tIME, ...)
// is metadata and gets dropped.
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'sBIT', 'bKGD', 'pHYs', 'acTL', 'fcTL', 'fdAT']);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function stripPng(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return buffer;

  const chunks = [buffer.subarray(0, 8)];
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const total = 12 + length; // length + type + data + crc

    if (offset + total > buffer.length) return buffer; // truncated; leave as-is

    if (PNG_KEEP.has(type)) {
      chunks.push(buffer.subarray(offset, offset + total));
    }

    offset += total;
    if (type === 'IEND') break;
  }

  return Buffer.concat(chunks);
}

// WebP is a RIFF container; EXIF and XMP live in their own chunks.
const WEBP_DROP = new Set(['EXIF', 'XMP ']);

function stripWebp(buffer) {
  if (buffer.length < 12) return buffer;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return buffer;

  const chunks = [];
  let offset = 12;
  let dropped = false;

  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const padded = size + (size % 2); // chunks are even-aligned
    const total = 8 + padded;

    if (offset + total > buffer.length) return buffer; // truncated; leave as-is

    if (WEBP_DROP.has(type)) {
      dropped = true;
    } else {
      chunks.push(buffer.subarray(offset, offset + total));
    }

    offset += total;
  }

  if (!dropped) return buffer;

  const body = Buffer.concat(chunks);
  const header = Buffer.from(buffer.subarray(0, 12));
  header.writeUInt32LE(body.length + 4, 4); // RIFF size = 'WEBP' + payload
  return Buffer.concat([header, body]);
}

/**
 * Remove metadata from an image buffer. Formats we cannot rewrite safely are
 * returned unchanged, so callers should keep the upload allowlist tight.
 */
function stripImageMetadata(buffer, mimetype) {
  try {
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') return stripJpeg(buffer);
    if (mimetype === 'image/png') return stripPng(buffer);
    if (mimetype === 'image/webp') return stripWebp(buffer);
    return buffer;
  } catch (err) {
    console.error('Metadata strip failed, uploading original:', err.message);
    return buffer;
  }
}

module.exports = { stripImageMetadata };
