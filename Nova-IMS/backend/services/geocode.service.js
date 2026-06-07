/**
 * Geocodificación inversa (lat/lng → dirección) para ubicacion.direccion
 */

function truncateAddress(text, max = 100) {
  const value = String(text || "").trim();
  if (!value) return null;
  return value.length > max ? value.substring(0, max) : value;
}

async function reverseGeocodeGoogle(lat, lng, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "es");
  url.searchParams.set("region", "co");

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]?.formatted_address) {
    return null;
  }
  return truncateAddress(data.results[0].formatted_address);
}

async function reverseGeocodeNominatim(lat, lng) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "es");

  const res = await fetch(url, {
    headers: { "User-Agent": "Nova-IMS/1.0 (location-share)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const label = data.display_name || data.name;
  return truncateAddress(label);
}

async function reverseGeocode(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const address = await reverseGeocodeGoogle(latNum, lngNum, apiKey);
      if (address) return address;
    } catch (err) {
      console.warn("[geocode] Google:", err.message);
    }
  }

  try {
    const address = await reverseGeocodeNominatim(latNum, lngNum);
    if (address) return address;
  } catch (err) {
    console.warn("[geocode] Nominatim:", err.message);
  }

  return truncateAddress(`${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`);
}

module.exports = { reverseGeocode };
