export const NAIROBI_CBD_CENTER = {
  lat: -1.2810399,
  lng: 36.8235669,
};

export const NAIROBI_CBD_RADIUS_KM = 3;

const toRadians = (value) => (value * Math.PI) / 180;

export const haversineDistanceKm = (from, to) => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getFootDeliveryEligibility = (coords) => {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return {
      eligible: false,
      reason: 'missing_location',
      distanceKm: null,
      radiusKm: NAIROBI_CBD_RADIUS_KM,
    };
  }

  const distanceKm = haversineDistanceKm(coords, NAIROBI_CBD_CENTER);

  return {
    eligible: distanceKm <= NAIROBI_CBD_RADIUS_KM,
    reason: distanceKm <= NAIROBI_CBD_RADIUS_KM ? 'inside_cbd' : 'outside_cbd',
    distanceKm,
    radiusKm: NAIROBI_CBD_RADIUS_KM,
  };
};

export const formatDistanceKm = (distanceKm) => {
  if (typeof distanceKm !== 'number' || Number.isNaN(distanceKm)) {
    return '—';
  }

  return `${distanceKm.toFixed(2)} km`;
};
