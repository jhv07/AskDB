import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Single axios instance ────────────────────────────────────────────────────
const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 90000,  // 90s — Ollama can be slow on first load
    headers: { 'Content-Type': 'application/json' },
});

// ─── JWT Interceptor: auto-attach token on every request ─────────────────────
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response Interceptor: handle 401 gracefully ─────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ─── API Methods ──────────────────────────────────────────────────────────────

/** Execute a natural language query against MongoDB via Ollama */
export const executeQuery = (userQuery) =>
    api.post('/query', { userQuery });

/** Fetch the full schema (collections, fields, indexes) */
export const fetchSchema = (forceRefresh = false) =>
    api.get(`/schema${forceRefresh ? '?refresh=true' : ''}`);

/** Fetch schema-aware query suggestion chips */
export const fetchSuggestions = () =>
    api.get('/schema/suggestions');

/** Fetch paginated query history for current user */
export const fetchHistory = ({ page = 1, limit = 20, search = '' } = {}) =>
    api.get(`/history?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);

/** Toggle favorite on a history entry */
export const toggleFavorite = (id) =>
    api.patch(`/history/${id}/favorite`);

/** Delete a single history entry */
export const deleteHistoryEntry = (id) =>
    api.delete(`/history/${id}`);

/** Clear all history for current user */
export const clearHistory = () =>
    api.delete('/history');

/** Health check */
export const healthCheck = () =>
    api.get('/test');

export default api;
