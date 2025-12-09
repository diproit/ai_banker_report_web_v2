import axios from 'axios';
import BASE_URL from '../config/api';

// Create axios instance
const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // send cookies for auth when using http-only cookies
    timeout: 30000,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});


// Response interceptor: unwrap data and propagate errors consistently
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Optionally emit a global event for 401/403 so callers can react
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status } }));
        }
        return Promise.reject(error);
    }
);

// Simple wrappers that return response.data for convenience
const unwrap = (p) => p.then((res) => res.data);

export const get = (url, config) => unwrap(api.get(url, config));
export const del = (url, config) => unwrap(api.delete(url, config));
export const post = (url, data, config) => unwrap(api.post(url, data, config));
export const put = (url, data, config) => unwrap(api.put(url, data, config));
export const patch = (url, data, config) => unwrap(api.patch(url, data, config));

// Streaming helper for POST endpoints using fetch Streams API
// Usage:
//   const { abort, done } = streamPost('/chat/send-stream', body, (chunk) => setText(t => t + chunk))
//   await done; // resolves when stream ends
export function streamPost(path, body, onChunk, options = {}) {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

    const fetchOptions = {
        method: 'POST',
        credentials: 'include', // send cookies in browser
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        body: JSON.stringify(body ?? {}),
        signal,
    };

    const done = (async () => {
        const res = await fetch(url, fetchOptions);
       
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Stream request failed (${res.status}): ${text}`);
        }

        if (!res.body) {
            // Older browsers may not support ReadableStream on Response
            const text = await res.text();
            if (text && typeof onChunk === 'function') onChunk(text);
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done: streamDone, value } = await reader.read();
            if (streamDone) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk && typeof onChunk === 'function') onChunk(chunk);
        }
    })();

    return { abort: () => ctrl.abort(), done };
}

export default api;
