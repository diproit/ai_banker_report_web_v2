import api, { get, post } from './apiClient';

/**
 * Login with username and password.
 * Server is expected to set an http-only auth cookie on success.
 * @param {string} user_name - Username/login id
 * @param {string} password - Plain password
 * @returns {Promise<any>} Response data (may include user object)
 */
export function login(user_name, password) {
    return post('/auth/login', { user_name, password });
}

/**
 * Logout current session (clears auth cookie on server).
 * @returns {Promise<any>} Response data
 */
export function logout() {
    return post('/auth/logout', {});
}

/**
 * Verify current session (cookie-based auth) and return validity/user info.
 * @returns {Promise<any>} Response data, e.g. { valid: boolean, user?: object }
 */
export function verify() {
    return get('/auth/verify');
}

export default {
    login,
    logout,
    verify,
};
