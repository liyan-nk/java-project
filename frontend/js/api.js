/**
 * CampusHub Central API Client
 * Wraps browser fetch with JSON serialization, error boundaries, SW cache busting,
 * canonical REST endpoints, and display-ready payload ID merging.
 */

const API_BASE = ''; // Same origin (http://localhost:8080)

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Sends a write-through cache invalidation message to the active Service Worker
 * so subsequent GET calls bypass or refresh stale caches.
 * @param {string} pattern
 */
function notifyCacheInvalidation(pattern) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'INVALIDATE_API_CACHE',
      pattern
    });
  }
}

/**
 * Low-level HTTP request helper
 * @param {string} endpoint
 * @param {RequestInit} [options={}]
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = (data && data.error) || (data && data.message) || `HTTP error ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[API Error ${error.status}] ${endpoint}:`, error.message);
      throw error;
    }
    console.error(`[Network Error] ${endpoint}:`, error.message);
    throw new ApiError(error.message || 'Network connection failure', 0, null);
  }
}

// =============================================================================
// 9 Canonical REST API Endpoints
// =============================================================================

/**
 * 1. GET /api/user (Optional query: ?email=...)
 * @param {string|null} [email=null]
 */
export async function getUser(email = null) {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return request(`/api/user${query}`, { method: 'GET' });
}

/**
 * 2. GET /api/timetable?userId={id} (userId is REQUIRED, no default)
 * @param {number} userId
 */
export async function getTimetable(userId) {
  if (!userId && userId !== 0) throw new Error('userId is required for getTimetable()');
  return request(`/api/timetable?userId=${encodeURIComponent(userId)}`, { method: 'GET' });
}

/**
 * 3. POST /api/timetable
 * The server responds with { id, status } or similar partial record.
 * This function merges the submitted entry payload with the server-assigned ID
 * so callers receive a display-ready record: { ...entry, id: result.id }.
 * @param {Object} entry
 */
export async function createTimetableEntry(entry) {
  const result = await request('/api/timetable', {
    method: 'POST',
    body: entry
  });
  notifyCacheInvalidation('/api/timetable');
  const id = (result && typeof result === 'object' && result.id) ? result.id : (result || Date.now());
  return { ...entry, id };
}

/**
 * 4. GET /api/attendance?userId={id} (userId is REQUIRED, no default)
 * @param {number} userId
 */
export async function getAttendance(userId) {
  if (!userId && userId !== 0) throw new Error('userId is required for getAttendance()');
  return request(`/api/attendance?userId=${encodeURIComponent(userId)}`, { method: 'GET' });
}

/**
 * 5. POST /api/attendance/step
 * @param {number} id
 * @param {boolean} attended
 */
export async function stepAttendance(id, attended) {
  const result = await request('/api/attendance/step', {
    method: 'POST',
    body: { id, attended }
  });
  notifyCacheInvalidation('/api/attendance');
  return result;
}

/**
 * 6. GET /api/marketplace (Optional query: ?category=...)
 * @param {string|null} [category=null]
 */
export async function getMarketplace(category = null) {
  const query = category && category !== 'ALL' ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/marketplace${query}`, { method: 'GET' });
}

/**
 * 7. POST /api/marketplace
 * The server responds with { id, status } or partial record.
 * This function merges the submitted item payload with the server-assigned ID:
 * { ...item, id: result.id }. Further display synthesis (e.g. sellerName) is performed
 * at the view call site using store session data.
 * @param {Object} item
 */
export async function createMarketplaceItem(item) {
  const result = await request('/api/marketplace', {
    method: 'POST',
    body: item
  });
  notifyCacheInvalidation('/api/marketplace');
  const id = (result && typeof result === 'object' && result.id) ? result.id : (result || Date.now());
  return { ...item, id };
}

/**
 * 8. GET /api/lostfound (Optional query: ?type=LOST|FOUND)
 * @param {'LOST'|'FOUND'|null} [type=null]
 */
export async function getLostFound(type = null) {
  const query = type && type !== 'ALL' ? `?type=${encodeURIComponent(type)}` : '';
  return request(`/api/lostfound${query}`, { method: 'GET' });
}

/**
 * 9. POST /api/lostfound/claim
 * @param {number} id
 * @param {string} [status='CLAIMED']
 */
export async function claimLostFoundItem(id, status = 'CLAIMED') {
  const result = await request('/api/lostfound/claim', {
    method: 'POST',
    body: { id, status }
  });
  notifyCacheInvalidation('/api/lostfound');
  return result;
}
