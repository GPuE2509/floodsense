/**
 * FloodSense Standard API Service Layer
 * A robust wrapper around native fetch offering custom headers, interceptors, and timeout handling.
 * Easily switch BASE_URL to connect to your real Backend Server.
 */

const BASE_URL = 'http://localhost:5000/api'; // Change to actual backend URL when ready

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  refreshQueue = [];
};

async function request(endpoint, options = {}, isRetry = false) {
  let token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  // Set timeout controller
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000); // 10s timeout default
  config.signal = controller.signal;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    clearTimeout(id);

    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh-token') && !isRetry) {
      const refreshToken = sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_data');
        sessionStorage.removeItem('auth_data');
        window.location.reload();
        throw new Error('Unauthorized access - please re-authenticate.');
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(newToken => {
          options.headers = options.headers || {};
          options.headers.Authorization = `Bearer ${newToken}`;
          return request(endpoint, options, true);
        }).catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh failed');
        }

        const data = await refreshRes.json();
        const newToken = data.token;

        if (sessionStorage.getItem('refresh_token')) {
          sessionStorage.setItem('auth_token', newToken);
        } else {
          localStorage.setItem('auth_token', newToken);
        }

        processQueue(null, newToken);
        isRefreshing = false;

        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${newToken}`;
        return request(endpoint, options, true);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;

        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_data');
        sessionStorage.removeItem('auth_data');
        window.location.reload();
        throw new Error('Session expired - please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Request failed with status ${response.status}`);
      error.response = {
        status: response.status,
        data: errorData,
      };
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('API Request timed out after 10 seconds.');
    }
    console.error('API Error details:', error);
    throw error;
  }
}

export const apiService = {
  // Emergency Guidelines
  getEmergencyGuidelines: () => request('/emergency-guidelines', { method: 'GET' }),
  getAdminEmergencyGuidelines: () => request('/emergency-guidelines/admin', { method: 'GET' }),
  createEmergencyGuideline: (data) => request('/emergency-guidelines', { method: 'POST', body: data }),
  updateEmergencyGuideline: (id, data) => request(`/emergency-guidelines/${id}`, { method: 'PUT', body: data }),
  deleteEmergencyGuideline: (id) => request(`/emergency-guidelines/${id}`, { method: 'DELETE' }),

  get: (endpoint, headers) => request(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: 'POST', body, headers }),
  put: (endpoint, body, headers) => request(endpoint, { method: 'PUT', body, headers }),
  patch: (endpoint, body, headers) => request(endpoint, { method: 'PATCH', body, headers }),
  delete: (endpoint, headers) => request(endpoint, { method: 'DELETE', headers }),
  upload: async (endpoint, formData, headers, method = 'PUT', isRetry = false) => {
    let token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    const configHeaders = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: configHeaders,
        body: formData,
      });

      if (response.status === 401 && !isRetry) {
        const refreshToken = sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');

        if (!refreshToken) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_data');
          sessionStorage.removeItem('auth_data');
          window.location.reload();
          throw new Error('Unauthorized access - please re-authenticate.');
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then(() => {
            return apiService.upload(endpoint, formData, headers, method, true);
          }).catch(err => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (!refreshRes.ok) {
            throw new Error('Refresh failed');
          }

          const data = await refreshRes.json();
          const newToken = data.token;

          if (sessionStorage.getItem('refresh_token')) {
            sessionStorage.setItem('auth_token', newToken);
          } else {
            localStorage.setItem('auth_token', newToken);
          }

          processQueue(null, newToken);
          isRefreshing = false;

          return apiService.upload(endpoint, formData, headers, method, true);
        } catch (err) {
          processQueue(err, null);
          isRefreshing = false;

          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_data');
          sessionStorage.removeItem('auth_data');
          window.location.reload();
          throw new Error('Session expired - please log in again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error details:', error);
      throw error;
    }
  },
  getBlob: async (endpoint, headers, isRetry = false) => {
    let token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    const configHeaders = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: configHeaders,
      });

      if (response.status === 401 && !isRetry) {
        const refreshToken = sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');

        if (!refreshToken) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_data');
          sessionStorage.removeItem('auth_data');
          window.location.reload();
          throw new Error('Unauthorized access - please re-authenticate.');
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then(() => {
            return apiService.getBlob(endpoint, headers, true);
          }).catch(err => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (!refreshRes.ok) {
            throw new Error('Refresh failed');
          }

          const data = await refreshRes.json();
          const newToken = data.token;

          if (sessionStorage.getItem('refresh_token')) {
            sessionStorage.setItem('auth_token', newToken);
          } else {
            localStorage.setItem('auth_token', newToken);
          }

          processQueue(null, newToken);
          isRefreshing = false;

          return apiService.getBlob(endpoint, headers, true);
        } catch (err) {
          processQueue(err, null);
          isRefreshing = false;

          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_data');
          sessionStorage.removeItem('auth_data');
          window.location.reload();
          throw new Error('Session expired - please log in again.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('API Error details:', error);
      throw error;
    }
  },
};

