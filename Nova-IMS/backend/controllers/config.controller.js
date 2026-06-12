const asyncHandler = require('../utils/asyncHandler');

/** Config pública para el frontend (sin auth). La key de Maps va restringida por HTTP referrer en Google Cloud. */
exports.publicConfig = asyncHandler(async (req, res) => {
  const googleMapsApiKey = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  res.json({ googleMapsApiKey });
});
