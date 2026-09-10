// server/utils/queryFilters.js
//
// Query parameters arrive from the network and can be repeated, malformed or
// absent. These helpers turn them into Mongo filters without throwing, so a
// bad parameter is answered with a 400 rather than a 500.

/**
 * Normalise a category parameter. Accepts "a,b", repeated ?categories=a&categories=b,
 * or any mixture, and ignores empty entries.
 */
function parseCategories(raw) {
  return (Array.isArray(raw) ? raw : [raw])
    .flatMap(value => (typeof value === 'string' ? value.split(',') : []))
    .map(value => value.trim())
    .filter(Boolean);
}

/**
 * Parse "lng1,lat1,lng2,lat2" into a Mongo $box, normalising corner order.
 * Returns { error } for anything that is not four finite numbers.
 */
function parseBox(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parts = String(value).split(',').map(Number);

  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) {
    return { error: 'bbox must be four numbers: lng1,lat1,lng2,lat2' };
  }

  const [lng1, lat1, lng2, lat2] = parts;
  return {
    box: [
      [Math.min(lng1, lng2), Math.min(lat1, lat2)],
      [Math.max(lng1, lng2), Math.max(lat1, lat2)]
    ]
  };
}

/**
 * Build a report filter from query (or body) parameters.
 * Returns { filter } or { error } - never throws.
 */
function buildReportFilter(query = {}) {
  const filter = {};
  const { bbox, categories, since } = query;

  if (categories !== undefined) {
    const list = parseCategories(categories);
    if (list.length > 0) filter.category = { $in: list };
  }

  if (since !== undefined) {
    const sinceDate = new Date(Array.isArray(since) ? since[0] : since);
    if (Number.isNaN(sinceDate.getTime())) {
      return { error: 'since must be a valid date' };
    }
    filter.timestamp = { $gte: sinceDate };
  }

  if (bbox !== undefined) {
    const { box, error } = parseBox(bbox);
    if (error) return { error };
    filter.location = { $geoWithin: { $box: box } };
  }

  return { filter };
}

/** Clamp a caller-supplied limit into a sane range. */
function parseLimit(raw, fallback, max) {
  const value = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, max);
}

/**
 * Spreadsheets execute cells beginning with =, +, - or @. Report text is user
 * input, so prefix those with a quote to keep CSV exports inert.
 */
function csvSafe(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

module.exports = { buildReportFilter, parseCategories, parseBox, parseLimit, csvSafe };
