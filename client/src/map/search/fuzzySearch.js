/**
 * Map Search Module - 3-Layer Architecture
 * 
 * Layer 1: Local Gazetteer (instant, curated Nairobi areas)
 * Layer 2: Nominatim Fallback (single query, rate-limited)
 * Layer 3: Strict Relevance Gate (filters garbage results)
 * 
 * Test cases that MUST pass:
 * - "kare" → Karen (NOT Mau Mau Road)
 * - "karren" → Karen
 * - "westlnds" → Westlands
 * - "kasrani" → Kasarani
 * - "xyzqwerty" → empty (NOT garbage)
 */

// ============================================================================
// LAYER 1: CURATED NAIROBI GAZETTEER
// ============================================================================

/**
 * Curated list of Nairobi areas with coordinates.
 * This is the primary search source - provides instant, reliable results.
 */
export const NAIROBI_AREAS = [
  // Core CBD & Central
  { name: "Nairobi CBD", lat: -1.2864, lng: 36.8172, aliases: ["cbd", "town", "city center", "city centre", "central"] },
  { name: "Uhuru Park", lat: -1.2889, lng: 36.8167, aliases: ["uhuru"] },
  { name: "Central Park", lat: -1.2833, lng: 36.8167, aliases: [] },
  
  // Western Nairobi
  { name: "Westlands", lat: -1.2673, lng: 36.8110, aliases: ["westlands", "westland"] },
  { name: "Parklands", lat: -1.2608, lng: 36.8178, aliases: ["parkland"] },
  { name: "Highridge", lat: -1.2583, lng: 36.8033, aliases: [] },
  { name: "Lavington", lat: -1.2797, lng: 36.7750, aliases: ["lavinton"] },
  { name: "Kilimani", lat: -1.2903, lng: 36.7856, aliases: ["kilmani", "klimani"] },
  { name: "Kileleshwa", lat: -1.2778, lng: 36.7811, aliases: ["kileleshwa", "kileleswa"] },
  { name: "Hurlingham", lat: -1.2925, lng: 36.7925, aliases: ["hurlngham"] },
  { name: "Yaya Centre", lat: -1.2917, lng: 36.7889, aliases: ["yaya"] },
  
  // Karen & Langata Area
  { name: "Karen", lat: -1.3192, lng: 36.7114, aliases: ["kare", "karren", "karen nairobi"] },
  { name: "Langata", lat: -1.3500, lng: 36.7500, aliases: ["langta", "langate"] },
  { name: "Hardy", lat: -1.3250, lng: 36.7333, aliases: [] },
  { name: "Ngong Road", lat: -1.3000, lng: 36.7667, aliases: ["ngong"] },
  { name: "Ongata Rongai", lat: -1.3958, lng: 36.7500, aliases: ["rongai", "rongai town"] },
  { name: "Bomas of Kenya", lat: -1.3417, lng: 36.7417, aliases: ["bomas"] },
  
  // South & South-Eastern
  { name: "South B", lat: -1.3111, lng: 36.8389, aliases: ["southb"] },
  { name: "South C", lat: -1.3167, lng: 36.8250, aliases: ["southc"] },
  { name: "Nairobi West", lat: -1.3083, lng: 36.8167, aliases: [] },
  { name: "Industrial Area", lat: -1.3083, lng: 36.8500, aliases: ["industrial"] },
  { name: "Embakasi", lat: -1.3167, lng: 36.9000, aliases: ["embaksi"] },
  { name: "Pipeline", lat: -1.3333, lng: 36.9167, aliases: [] },
  { name: "Donholm", lat: -1.2972, lng: 36.8833, aliases: [] },
  { name: "Buruburu", lat: -1.2917, lng: 36.8750, aliases: ["buru buru", "buru"] },
  { name: "Umoja", lat: -1.2833, lng: 36.8917, aliases: [] },
  
  // Eastern Nairobi
  { name: "Eastleigh", lat: -1.2750, lng: 36.8500, aliases: ["eastliegh", "eastleigh nairobi"] },
  { name: "Mathare", lat: -1.2583, lng: 36.8583, aliases: [] },
  { name: "Pangani", lat: -1.2667, lng: 36.8333, aliases: [] },
  { name: "Kariobangi", lat: -1.2583, lng: 36.8833, aliases: ["k-bangi", "karibangi"] },
  
  // Northern Nairobi
  { name: "Kasarani", lat: -1.2333, lng: 36.8833, aliases: ["kasrani", "kasarani stadium"] },
  { name: "Roysambu", lat: -1.2167, lng: 36.8833, aliases: ["roysumbu"] },
  { name: "Thika Road", lat: -1.2167, lng: 36.8667, aliases: ["thika"] },
  { name: "Garden Estate", lat: -1.2250, lng: 36.8667, aliases: [] },
  { name: "Ridgeways", lat: -1.2333, lng: 36.8167, aliases: [] },
  { name: "Muthaiga", lat: -1.2500, lng: 36.8167, aliases: [] },
  { name: "Gigiri", lat: -1.2361, lng: 36.8028, aliases: ["un gigiri", "united nations"] },
  { name: "Runda", lat: -1.2167, lng: 36.7833, aliases: ["runda estate"] },
  { name: "Village Market", lat: -1.2306, lng: 36.8056, aliases: ["village"] },
  { name: "Two Rivers", lat: -1.2167, lng: 36.8000, aliases: ["two rivers mall"] },
  
  // Upper Hill & Environs
  { name: "Upper Hill", lat: -1.2972, lng: 36.8139, aliases: ["upperhill"] },
  { name: "Milimani", lat: -1.2917, lng: 36.8083, aliases: [] },
  { name: "Hospital Hill", lat: -1.2861, lng: 36.8083, aliases: [] },
  { name: "Community", lat: -1.2833, lng: 36.8000, aliases: [] },
  
  // Kiambu & Satellite Towns
  { name: "Ruaka", lat: -1.2000, lng: 36.7833, aliases: [] },
  { name: "Kikuyu", lat: -1.2500, lng: 36.6667, aliases: [] },
  { name: "Kiambu Town", lat: -1.1667, lng: 36.8333, aliases: ["kiambu"] },
  { name: "Ruiru", lat: -1.1500, lng: 36.9500, aliases: [] },
  { name: "Juja", lat: -1.1000, lng: 37.0167, aliases: [] },
  { name: "Thika Town", lat: -1.0333, lng: 37.0833, aliases: ["thika town"] },
  
  // Malls & Landmarks
  { name: "Sarit Centre", lat: -1.2642, lng: 36.8033, aliases: ["sarit"] },
  { name: "Westgate Mall", lat: -1.2617, lng: 36.8050, aliases: ["westgate"] },
  { name: "The Hub Karen", lat: -1.3167, lng: 36.7083, aliases: ["hub karen", "the hub"] },
  { name: "Junction Mall", lat: -1.2958, lng: 36.7750, aliases: ["junction", "the junction"] },
  { name: "Garden City Mall", lat: -1.2333, lng: 36.8833, aliases: ["garden city"] },
  { name: "Galleria Mall", lat: -1.3333, lng: 36.7583, aliases: ["galleria"] },
  { name: "T-Mall", lat: -1.2167, lng: 36.8833, aliases: ["tmall", "t mall", "thika mall"] },
  { name: "Nextgen Mall", lat: -1.3083, lng: 36.8083, aliases: ["nextgen"] },
  
  // Airports
  { name: "JKIA", lat: -1.3192, lng: 36.9275, aliases: ["jomo kenyatta", "jkia airport", "nairobi airport"] },
  { name: "Wilson Airport", lat: -1.3219, lng: 36.8147, aliases: ["wilson"] },
  
  // Universities & Institutions
  { name: "University of Nairobi", lat: -1.2800, lng: 36.8167, aliases: ["uon", "main campus"] },
  { name: "Kenyatta University", lat: -1.1833, lng: 36.9333, aliases: ["ku", "kenyatta uni"] },
  { name: "USIU", lat: -1.2250, lng: 36.8333, aliases: ["usiu africa"] },
  { name: "Strathmore University", lat: -1.3097, lng: 36.8117, aliases: ["strathmore"] },
  
  // Hospitals
  { name: "Kenyatta National Hospital", lat: -1.3014, lng: 36.8072, aliases: ["knh", "kenyatta hospital"] },
  { name: "Nairobi Hospital", lat: -1.2917, lng: 36.8083, aliases: [] },
  { name: "Aga Khan Hospital", lat: -1.2639, lng: 36.8183, aliases: ["aga khan"] },
  { name: "MP Shah Hospital", lat: -1.2667, lng: 36.8083, aliases: ["mp shah"] },
  
  // Other Areas
  { name: "Kibera", lat: -1.3133, lng: 36.7817, aliases: [] },
  { name: "Kawangware", lat: -1.2833, lng: 36.7500, aliases: [] },
  { name: "Dagoretti", lat: -1.2833, lng: 36.7333, aliases: [] },
  { name: "Adams Arcade", lat: -1.3000, lng: 36.7833, aliases: ["adams"] },
  { name: "Ngara", lat: -1.2750, lng: 36.8250, aliases: [] },
  { name: "Zimmerman", lat: -1.2167, lng: 36.9000, aliases: [] },
  { name: "Kahawa", lat: -1.1833, lng: 36.9333, aliases: ["kahawa west", "kahawa sukari"] },
  { name: "Githurai", lat: -1.2000, lng: 36.9167, aliases: ["githurai 45", "githurai 44"] },
  { name: "Mwiki", lat: -1.1833, lng: 36.9167, aliases: [] },
  { name: "Kayole", lat: -1.2750, lng: 36.9167, aliases: [] },
  { name: "Njiru", lat: -1.2833, lng: 37.0000, aliases: [] },
  { name: "Utawala", lat: -1.2833, lng: 36.9667, aliases: [] },
  { name: "Syokimau", lat: -1.3500, lng: 36.9333, aliases: [] },
  { name: "Mlolongo", lat: -1.3833, lng: 36.9333, aliases: [] },
  { name: "Kitengela", lat: -1.4667, lng: 36.9667, aliases: [] },
  { name: "Athi River", lat: -1.4500, lng: 36.9833, aliases: ["athiriver", "mavoko"] },
];

// ============================================================================
// SIMILARITY FUNCTIONS
// ============================================================================

/**
 * Levenshtein edit distance between two strings.
 * Returns the minimum number of single-character edits needed.
 */
export function levenshtein(a, b) {
  if (!a || !b) return Math.max((a || '').length, (b || '').length);
  
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;
  
  const matrix = [];
  
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[bLower.length][aLower.length];
}

/**
 * Jaro-Winkler similarity score (0-1, higher is better).
 * Optimized for short strings and common prefix bonus.
 */
export function jaroWinkler(s1, s2) {
  if (!s1 || !s2) return 0;
  
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  
  if (a === b) return 1;
  
  const len1 = a.length;
  const len2 = b.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matching characters
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (matches2[j] || a[i] !== b[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  
  // Jaro similarity
  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - transpositions / 2) / matches
  ) / 3;
  
  // Winkler modification: bonus for common prefix
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(len1, len2));
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ============================================================================
// LAYER 2: LOCAL GAZETTEER MATCHING
// ============================================================================

/**
 * Match query against local gazetteer.
 * Returns matching areas sorted by relevance.
 */
export function matchLocalGazetteer(query, limit = 5) {
  if (!query || typeof query !== 'string') return [];
  
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  
  const results = [];
  
  for (const area of NAIROBI_AREAS) {
    const nameLower = area.name.toLowerCase();
    
    // Exact match on name
    if (nameLower === q) {
      results.push({ ...area, score: 1.0, matchType: 'exact' });
      continue;
    }
    
    // Exact match on alias
    const aliasMatch = area.aliases.find(a => a.toLowerCase() === q);
    if (aliasMatch) {
      results.push({ ...area, score: 0.99, matchType: 'alias-exact' });
      continue;
    }
    
    // Prefix match on name
    if (nameLower.startsWith(q)) {
      const score = 0.90 + (q.length / nameLower.length) * 0.09;
      results.push({ ...area, score, matchType: 'prefix' });
      continue;
    }
    
    // Prefix match on alias
    const aliasPrefixMatch = area.aliases.find(a => a.toLowerCase().startsWith(q));
    if (aliasPrefixMatch) {
      const score = 0.85 + (q.length / aliasPrefixMatch.length) * 0.09;
      results.push({ ...area, score, matchType: 'alias-prefix' });
      continue;
    }
    
    // Fuzzy match on name - Jaro-Winkler
    const jwScore = jaroWinkler(q, nameLower);
    const editDist = levenshtein(q, nameLower);
    const maxAllowedEdits = Math.max(1, Math.floor(q.length * 0.4));
    
    if (jwScore >= 0.80 && editDist <= maxAllowedEdits) {
      results.push({ ...area, score: jwScore * 0.9, matchType: 'fuzzy' });
      continue;
    }
    
    // Fuzzy match on aliases
    for (const alias of area.aliases) {
      const aliasJw = jaroWinkler(q, alias.toLowerCase());
      const aliasEdit = levenshtein(q, alias.toLowerCase());
      const aliasMaxEdits = Math.max(1, Math.floor(alias.length * 0.4));
      
      if (aliasJw >= 0.80 && aliasEdit <= aliasMaxEdits) {
        results.push({ ...area, score: aliasJw * 0.85, matchType: 'fuzzy-alias' });
        break;
      }
    }
  }
  
  // Sort by score descending and limit
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ============================================================================
// LAYER 3: NOMINATIM FALLBACK + RELEVANCE GATE
// ============================================================================

/**
 * Strict relevance check for Nominatim results.
 * Returns true only if the result is clearly relevant to the query.
 */
export function isRelevant(query, displayName) {
  if (!query || !displayName) return false;
  
  const q = query.toLowerCase().trim();
  const d = displayName.toLowerCase();
  
  // Extract first meaningful part of display name (before first comma)
  const firstPart = d.split(',')[0].trim();
  
  // Rule 1: If query is very short (2-3 chars), require exact prefix match
  if (q.length <= 3) {
    if (firstPart.startsWith(q) || d.includes(` ${q}`) || d.startsWith(q)) {
      return true;
    }
    return false;
  }
  
  // Rule 2: Jaro-Winkler similarity check
  const jwScore = jaroWinkler(q, firstPart);
  if (jwScore >= 0.70) return true;
  
  // Rule 3: Edit distance proportional to query length
  const editDist = levenshtein(q, firstPart);
  const maxAllowedEdits = Math.max(1, Math.floor(q.length * 0.35));
  if (editDist <= maxAllowedEdits) return true;
  
  // Rule 4: Query appears as substring in display name
  if (d.includes(q)) return true;
  
  // Rule 5: Check each word in the display name
  const words = d.split(/[\s,]+/);
  for (const word of words) {
    if (word.length < 3) continue;
    const wordJw = jaroWinkler(q, word);
    const wordEdit = levenshtein(q, word);
    if (wordJw >= 0.80 || wordEdit <= maxAllowedEdits) return true;
  }
  
  return false;
}

// Rate limiting for Nominatim (1 request per 1.1 seconds)
let lastNominatimCall = 0;
const NOMINATIM_RATE_LIMIT = 1100;

/**
 * Fetch from Nominatim with rate limiting.
 * Returns filtered, relevant results only.
 */
async function fetchNominatim(query) {
  // Rate limit enforcement
  const now = Date.now();
  const timeSinceLastCall = now - lastNominatimCall;
  if (timeSinceLastCall < NOMINATIM_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_RATE_LIMIT - timeSinceLastCall));
  }
  lastNominatimCall = Date.now();
  
  // Build query with Nairobi context
  const searchQuery = query.toLowerCase().includes('nairobi') 
    ? query 
    : `${query}, Nairobi, Kenya`;
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&countrycodes=ke`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TajiCart/1.0 (delivery-app)',
        'Accept-Language': 'en'
      }
    });
    
    if (!response.ok) {
      console.warn('[FuzzySearch] Nominatim error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // Apply strict relevance gate
    const filtered = data.filter(item => isRelevant(query, item.display_name));
    
    return filtered.map(item => ({
      name: item.display_name.split(',')[0].trim(),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      score: 0.6, // Lower priority than local matches
      matchType: 'nominatim',
      raw: item
    }));
  } catch (error) {
    console.warn('[FuzzySearch] Nominatim fetch error:', error);
    return [];
  }
}

// ============================================================================
// REVERSE GEOCODING (lat/lng → address data)
// ============================================================================

// Rate limiting for reverse geocode (shares with forward search)
let lastReverseCall = 0;

/**
 * Reverse geocode coordinates to structured address data.
 * Returns Nominatim address components mapped to form fields.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Structured address data or null on error
 */
export async function reverseGeocode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    console.warn('[FuzzySearch] Invalid coords for reverse geocode:', lat, lng);
    return null;
  }

  // Rate limit enforcement (shares with forward search)
  const now = Date.now();
  const timeSinceLastCall = Math.min(now - lastNominatimCall, now - lastReverseCall);
  if (timeSinceLastCall < NOMINATIM_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_RATE_LIMIT - timeSinceLastCall));
  }
  lastReverseCall = Date.now();

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TajiCart/1.0 (delivery-app)',
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) {
      console.warn('[FuzzySearch] Reverse geocode error:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data || data.error) {
      console.warn('[FuzzySearch] Reverse geocode no result:', data?.error);
      return null;
    }

    const addr = data.address || {};
    
    // Map Nominatim components to form fields:
    // Address: building → house_number + road → neighbourhood → suburb
    const addressParts = [
      addr.building,
      addr.house_number ? `${addr.house_number} ${addr.road || ''}`.trim() : addr.road,
      addr.neighbourhood,
      addr.suburb
    ].filter(Boolean);
    
    const addressLine = addressParts[0] || addr.amenity || addr.shop || addr.office || 
                        `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    // City/Area: suburb → neighbourhood → city_district → city → town → village
    const cityArea = addr.suburb || addr.neighbourhood || addr.city_district || 
                     addr.city || addr.town || addr.village || 'Nairobi';
    
    // County: county → state → default to Nairobi
    const county = addr.county || addr.state || 'Nairobi';
    
    // Postal Code: postcode
    const postalCode = addr.postcode || '';
    
    // Country: country → default to Kenya
    const country = addr.country || 'Kenya';
    
    // Full display name
    const displayName = data.display_name || `${addressLine}, ${cityArea}, ${country}`;

    return {
      addressLine,
      cityArea,
      county,
      postalCode,
      country,
      displayName,
      raw: data,
      coords: { lat, lng }
    };
  } catch (error) {
    console.warn('[FuzzySearch] Reverse geocode fetch error:', error);
    return null;
  }
}

// ============================================================================
// MAIN SEARCH FUNCTION
// ============================================================================

// Simple cache for recent searches
const searchCache = new Map();
const CACHE_TTL = 60000; // 1 minute
const MAX_CACHE_SIZE = 50;

function getCached(query) {
  const key = query.toLowerCase().trim();
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  return null;
}

function setCache(query, results) {
  const key = query.toLowerCase().trim();
  
  // Evict old entries if cache is full
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
  
  searchCache.set(key, { results, timestamp: Date.now() });
}

/**
 * Main search function - 3-layer architecture.
 * 
 * @param {string} query - User's search input
 * @param {Object} options - Search options
 * @param {number} options.limit - Max results (default: 8)
 * @param {boolean} options.localOnly - Skip Nominatim (default: false)
 * @returns {Promise<Array>} Array of location results
 */
export async function searchAddress(query, options = {}) {
  const { limit = 8, localOnly = false } = options;
  
  if (!query || typeof query !== 'string') return [];
  
  const q = query.trim();
  if (q.length < 2) return [];
  
  // Check cache first
  const cached = getCached(q);
  if (cached) return cached.slice(0, limit);
  
  // Layer 1: Local gazetteer (instant)
  const localResults = matchLocalGazetteer(q, limit);
  
  // If we have good local matches, return them without hitting Nominatim
  const hasExcellentLocal = localResults.some(r => r.score >= 0.85);
  if (hasExcellentLocal || localOnly) {
    const results = localResults.slice(0, limit).map(r => ({
      name: r.name,
      displayName: `${r.name}, Nairobi, Kenya`,
      lat: r.lat,
      lng: r.lng,
      score: r.score,
      matchType: r.matchType,
      source: 'local'
    }));
    setCache(q, results);
    return results;
  }
  
  // Layer 2: Nominatim fallback (single request, rate-limited)
  const nominatimResults = await fetchNominatim(q);
  
  // Merge results: local first, then Nominatim
  const allResults = [];
  const seenNames = new Set();
  
  // Add local results first
  for (const r of localResults) {
    const key = r.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      allResults.push({
        name: r.name,
        displayName: `${r.name}, Nairobi, Kenya`,
        lat: r.lat,
        lng: r.lng,
        score: r.score,
        matchType: r.matchType,
        source: 'local'
      });
    }
  }
  
  // Add Nominatim results (deduplicated)
  for (const r of nominatimResults) {
    const key = r.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      allResults.push({
        ...r,
        source: 'nominatim'
      });
    }
  }
  
  // Sort by score and limit
  allResults.sort((a, b) => b.score - a.score);
  const finalResults = allResults.slice(0, limit);
  
  setCache(q, finalResults);
  return finalResults;
}

// ============================================================================
// LEGACY COMPATIBILITY EXPORTS
// ============================================================================

/**
 * Legacy fuzzyGeocode function for backward compatibility.
 * Wraps the new searchAddress function.
 */
export async function fuzzyGeocode(query, options = {}) {
  return searchAddress(query, options);
}

/**
 * Legacy smartSearch function for backward compatibility.
 */
export async function smartSearch(query, options = {}) {
  return searchAddress(query, options);
}

/**
 * Legacy rankAndFilter function - now handled internally.
 * Returns results as-is since filtering is built into searchAddress.
 */
export function rankAndFilter(results, query) {
  // Results are already filtered and ranked
  return results;
}

/**
 * Export Nairobi aliases map for compatibility.
 */
export const NAIROBI_ALIASES = Object.fromEntries(
  NAIROBI_AREAS.flatMap(area => [
    [area.name.toLowerCase(), area.name],
    ...area.aliases.map(alias => [alias.toLowerCase(), area.name])
  ])
);

// Default export for convenience
export default {
  searchAddress,
  reverseGeocode,
  fuzzyGeocode,
  smartSearch,
  matchLocalGazetteer,
  isRelevant,
  levenshtein,
  jaroWinkler,
  NAIROBI_AREAS,
  NAIROBI_ALIASES
};
