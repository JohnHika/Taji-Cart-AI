const CBD_CENTER = {
  lat: Number(process.env.NAIROBI_CBD_CENTER_LAT || -1.2810399),
  lng: Number(process.env.NAIROBI_CBD_CENTER_LNG || 36.8235669),
};

const FOOT_DELIVERY_CBD_RADIUS_KM = Number(process.env.FOOT_DELIVERY_CBD_RADIUS_KM || 3);

export const DEFAULT_DELIVERY_CHARGE = Number(process.env.DEFAULT_DELIVERY_CHARGE || 100); // KES

const normalizeCoordinate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isFootDeliveryMode = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'foot' || normalized === 'walking' || normalized === 'walker';
};

export const getDeliveryModeFromPayload = (payload = {}) => {
  return (
    payload.delivery_mode ||
    payload.deliveryMode ||
    payload.delivery_method ||
    payload.deliveryMethod ||
    ''
  );
};

export const extractCoordinatesFromPayload = (payload = {}) => {
  const candidateSources = [
    payload.customerLocation,
    payload.customer_location,
    payload.deliveryCoordinates,
    payload.delivery_coordinates,
    payload.coordinates,
    payload.location,
    payload.guestShipping?.coordinates,
    payload.guestShipping?.location,
  ].filter(Boolean);

  for (const source of candidateSources) {
    const lat = normalizeCoordinate(source?.lat ?? source?.latitude);
    const lng = normalizeCoordinate(source?.lng ?? source?.lon ?? source?.longitude);

    if (lat !== null && lng !== null) {
      return { lat, lng };
    }
  }

  return null;
};

export const haversineDistanceKm = (from, to) => {
  const toRadians = (value) => (value * Math.PI) / 180;

  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const earthRadiusKm = 6371;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getCbdFootDeliveryStatus = (coordinates) => {
  if (!coordinates) {
    return {
      allowed: false,
      reason: 'missing_coordinates',
      distanceKm: null,
      radiusKm: FOOT_DELIVERY_CBD_RADIUS_KM,
      center: CBD_CENTER,
    };
  }

  const distanceKm = haversineDistanceKm(coordinates, CBD_CENTER);

  return {
    allowed: distanceKm <= FOOT_DELIVERY_CBD_RADIUS_KM,
    reason: distanceKm <= FOOT_DELIVERY_CBD_RADIUS_KM ? 'within_cbd' : 'outside_cbd',
    distanceKm,
    radiusKm: FOOT_DELIVERY_CBD_RADIUS_KM,
    center: CBD_CENTER,
  };
};
