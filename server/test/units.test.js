// Run with: npm test
// Uses node:test, so there is no test dependency to install.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';

const { buildReportFilter, parseCategories, parseBox, parseLimit, csvSafe } = require('../utils/queryFilters');
const { stripImageMetadata } = require('../utils/stripMetadata');
const { passwordMatches, issueAdminToken } = require('../middleware/adminAuth');
const jwt = require('jsonwebtoken');

test('categories accept comma lists and repeated parameters', () => {
  assert.deepEqual(parseCategories('safety,traffic'), ['safety', 'traffic']);
  assert.deepEqual(parseCategories(['safety', 'traffic']), ['safety', 'traffic']);
  assert.deepEqual(parseCategories(['safety,water', 'traffic']), ['safety', 'water', 'traffic']);
  assert.deepEqual(parseCategories(''), []);
});

test('a repeated categories parameter does not throw', () => {
  // Previously `categories.split` threw on an array and surfaced as a 500.
  const { filter, error } = buildReportFilter({ categories: ['safety', 'traffic'] });
  assert.equal(error, undefined);
  assert.deepEqual(filter.category, { $in: ['safety', 'traffic'] });
});

test('an unparseable since is rejected, not passed to the database', () => {
  const { error } = buildReportFilter({ since: 'notadate' });
  assert.match(error, /valid date/);
});

test('a malformed bbox is rejected', () => {
  assert.match(parseBox('1,2,three,4').error, /four numbers/);
  assert.match(buildReportFilter({ bbox: 'nonsense' }).error, /four numbers/);
});

test('bbox corners are normalised regardless of the order given', () => {
  const { box } = parseBox('78.5,17.5,78.3,17.4');
  assert.deepEqual(box, [[78.3, 17.4], [78.5, 17.5]]);
});

test('limits are clamped to the allowed range', () => {
  assert.equal(parseLimit('50', 100, 2000), 50);
  assert.equal(parseLimit('999999', 100, 2000), 2000);
  assert.equal(parseLimit('abc', 100, 2000), 100);
  assert.equal(parseLimit(undefined, 100, 2000), 100);
  assert.equal(parseLimit('-5', 100, 2000), 100);
});

test('csv export neutralises spreadsheet formulas', () => {
  assert.equal(csvSafe('=HYPERLINK("http://evil","click")'), "'=HYPERLINK(\"http://evil\",\"click\")");
  assert.equal(csvSafe('+1'), "'+1");
  assert.equal(csvSafe('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvSafe('Pothole on Main St'), 'Pothole on Main St');
  assert.equal(csvSafe(null), '');
});

test('admin password comparison accepts only the exact password', () => {
  assert.equal(passwordMatches('correct-horse-battery'), true);
  assert.equal(passwordMatches('correct-horse-batter'), false);
  assert.equal(passwordMatches(''), false);
  assert.equal(passwordMatches(undefined), false);
});

test('an admin token carries the admin role and expires', () => {
  const decoded = jwt.verify(issueAdminToken(), process.env.JWT_SECRET);
  assert.equal(decoded.role, 'admin');
  assert.ok(decoded.exp > decoded.iat);
});

// --- photo metadata ---

function jpegSegment(marker, payload) {
  const header = Buffer.alloc(4);
  header[0] = 0xff;
  header[1] = marker;
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

function jpegWithExif() {
  const app0 = jpegSegment(0xe0, Buffer.from('JFIF\0\x01\x02\0\0\x01\0\x01\0\0', 'binary'));
  const app1 = jpegSegment(0xe1, Buffer.concat([
    Buffer.from('Exif\0\0'),
    Buffer.from('II*\0GPSLatitude 17.447 GPSLongitude 78.396')
  ]));
  const scan = Buffer.concat([
    Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]),
    Buffer.from([0x11, 0x22, 0x33, 0x44])
  ]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, app1, scan, Buffer.from([0xff, 0xd9])]);
}

test('jpeg GPS metadata is removed but the image survives', () => {
  const original = jpegWithExif();
  assert.ok(original.includes('GPSLatitude'), 'fixture should contain GPS data');

  const cleaned = stripImageMetadata(original, 'image/jpeg');
  assert.equal(cleaned.includes('GPSLatitude'), false, 'GPS data must not reach the bucket');
  assert.ok(cleaned.includes('JFIF'), 'JFIF header is required by decoders');
  assert.ok(cleaned.includes(Buffer.from([0x11, 0x22, 0x33, 0x44])), 'pixel data must be preserved');
  assert.equal(cleaned[0], 0xff);
  assert.equal(cleaned[1], 0xd8);
  assert.equal(cleaned[cleaned.length - 2], 0xff);
  assert.equal(cleaned[cleaned.length - 1], 0xd9);
});

test('png text chunks are removed and image chunks kept', () => {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, Buffer.from(type), data, Buffer.alloc(4)]);
  };
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', Buffer.alloc(13)),
    chunk('tEXt', Buffer.from('Comment\0taken at home')),
    chunk('IDAT', Buffer.from([1, 2, 3])),
    chunk('IEND', Buffer.alloc(0))
  ]);

  const cleaned = stripImageMetadata(png, 'image/png');
  assert.equal(cleaned.includes('taken at home'), false);
  assert.ok(cleaned.includes('IDAT'));
  assert.ok(cleaned.includes('IEND'));
});

test('unknown image types are passed through untouched', () => {
  const gif = Buffer.from('GIF89a-not-really-a-gif');
  assert.ok(stripImageMetadata(gif, 'image/gif').equals(gif));
});
