const asyncHandler = require('../utils/asyncHandler');

exports.publicConfig = asyncHandler(async (req, res) => {
  const googleMapsApiKey = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  res.json({ googleMapsApiKey });
});
